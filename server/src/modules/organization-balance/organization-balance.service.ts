import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { BalanceTransactionType, BalanceReferenceType } from '@prisma/client';

import { OrganizationBalanceRepository } from './organization-balance.repository';
import { CreateDepositDto, QueryBalanceTransactionDto } from './dto';
import { IOrganizationBalance, IOrganizationBalanceTransaction, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';

@Injectable()
export class OrganizationBalanceService {
    private readonly BALANCE_CACHE_TTL: number;
    private readonly TRANSACTION_LIST_CACHE_TTL: number;

    constructor(
        private readonly repository: OrganizationBalanceRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly i18n: I18nService,
    ) {
        this.BALANCE_CACHE_TTL = this.configService.get<number>('REDIS_ACCOUNT_BALANCE_CACHE_TTL') || 300;
        this.TRANSACTION_LIST_CACHE_TTL = this.configService.get<number>('REDIS_BALANCE_TRANSACTION_LIST_CACHE_TTL') || 60;
    }

    private getBalanceCacheKey(organizationId: string): string {
        return `organization_balance:${organizationId}`;
    }

    private getTransactionListCacheKey(organizationId: string, query: QueryBalanceTransactionDto): string {
        return `organization_balance_transactions:${organizationId}:${JSON.stringify(query)}`;
    }

    /**
     * Lấy số dư của tổ chức
     */
    async getOrganizationBalance(organizationId: string, lang: string = 'vi'): Promise<IOrganizationBalance> {
        const cacheKey = this.getBalanceCacheKey(organizationId);
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const balance = await this.repository.getOrCreateByOrganizationId(organizationId);
        await this.redisService.set(cacheKey, JSON.stringify(balance), this.BALANCE_CACHE_TTL);

        return balance;
    }

    /**
     * Lấy lịch sử giao dịch của tổ chức
     */
    async getOrganizationTransactions(
        organizationId: string,
        query: QueryBalanceTransactionDto,
        lang: string = 'vi',
    ): Promise<IPaginatedResponse<IOrganizationBalanceTransaction>> {
        const cacheKey = this.getTransactionListCacheKey(organizationId, query);
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findTransactionsByOrganizationId(organizationId, query);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.TRANSACTION_LIST_CACHE_TTL);

        return result;
    }

    /**
     * Nạp tiền vào tài khoản tổ chức - Tạo payment request
     * Lưu ý: Số dư chỉ được cộng sau khi thanh toán thành công (webhook)
     */
    async createDepositRequest(
        organizationId: string,
        userId: string,
        dto: CreateDepositDto,
        lang: string = 'vi',
    ): Promise<{ paymentCode: string; qrCode: string; amount: number; expiredAt: Date }> {
        // Việc tạo payment sẽ được xử lý trong SepayService
        // Service này chỉ validate và log

        await this.systemLogService.log({
            level: 'INFO',
            module: 'OrganizationBalance',
            action: 'deposit.request',
            message: `Organization ${organizationId} yêu cầu nạp ${dto.amount} VND bởi user ${userId}`,
            userId,
            metaData: { organizationId, amount: dto.amount, notes: dto.notes },
        });

        // Return placeholder - sẽ được gọi từ controller qua SepayService
        throw new BadRequestException(
            await this.i18n.translate('organization-balance.USE_DEPOSIT_ENDPOINT', { lang }),
        );
    }

    /**
     * Xử lý nạp tiền thành công (được gọi từ webhook)
     */
    async processDepositSuccess(
        organizationId: string,
        amount: number,
        paymentId: string,
        paymentCode: string,
        performedByUserId?: string,
    ): Promise<{ balance: IOrganizationBalance; transaction: IOrganizationBalanceTransaction }> {
        const result = await this.repository.updateBalance(
            organizationId,
            BalanceTransactionType.DEPOSIT,
            amount,
            performedByUserId || null,
            {
                referenceType: BalanceReferenceType.PAYMENT,
                referenceId: paymentId,
                description: `Nạp tiền qua thanh toán ${paymentCode}`,
            },
        );

        // Invalidate cache
        await this.invalidateOrganizationCache(organizationId);

        // Emit realtime event
        this.websocketGateway.server.to(`organization:${organizationId}`).emit('organizationBalance:updated', {
            organizationId,
            balance: result.balance.balance,
            type: 'DEPOSIT',
            amount,
            timestamp: new Date().toISOString(),
        });

        this.websocketGateway.server.to(`organization:${organizationId}`).emit('organizationBalanceTransaction:created', {
            organizationId,
            transaction: result.transaction,
            timestamp: new Date().toISOString(),
        });

        this.websocketGateway.server.to(`organization:${organizationId}`).emit('deposit:completed', {
            organizationId,
            amount,
            newBalance: result.balance.balance,
            paymentCode,
            timestamp: new Date().toISOString(),
        });

        await this.systemLogService.log({
            level: 'INFO',
            module: 'OrganizationBalance',
            action: 'deposit.success',
            message: `Organization ${organizationId} nạp thành công ${amount} VND`,
            metaData: { organizationId, amount, paymentId, paymentCode, newBalance: result.balance.balance },
        });

        return result;
    }

    /**
     * Trừ tiền khi thanh toán (internal use)
     */
    async processPayment(
        organizationId: string,
        amount: number,
        referenceType: BalanceReferenceType,
        referenceId: string,
        description: string,
        performedByUserId?: string,
    ): Promise<{ balance: IOrganizationBalance; transaction: IOrganizationBalanceTransaction }> {
        // Kiểm tra số dư
        const currentBalance = await this.repository.getOrCreateByOrganizationId(organizationId);
        if (currentBalance.balance < amount) {
            throw new BadRequestException('Số dư không đủ');
        }

        const result = await this.repository.updateBalance(
            organizationId,
            BalanceTransactionType.PAYMENT,
            amount,
            performedByUserId || null,
            {
                referenceType,
                referenceId,
                description,
            },
        );

        await this.invalidateOrganizationCache(organizationId);

        this.websocketGateway.server.to(`organization:${organizationId}`).emit('organizationBalance:updated', {
            organizationId,
            balance: result.balance.balance,
            type: 'PAYMENT',
            amount: -amount,
            timestamp: new Date().toISOString(),
        });

        return result;
    }



    /**
     * Invalidate cache của organization
     */
    async invalidateOrganizationCache(organizationId: string): Promise<void> {
        await this.redisService.del(this.getBalanceCacheKey(organizationId));
        await this.redisService.delByPattern(`organization_balance_transactions:${organizationId}:*`);
    }
}
