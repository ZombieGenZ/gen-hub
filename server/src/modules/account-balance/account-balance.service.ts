import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { BalanceTransactionType, BalanceReferenceType } from '@prisma/client';

import { AccountBalanceRepository } from './account-balance.repository';
import { CreateDepositDto, AdjustBalanceDto, QueryBalanceTransactionDto } from './dto';
import { IOrganizationBalance, IOrganizationBalanceTransaction, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';

@Injectable()
export class AccountBalanceService {
    private readonly BALANCE_CACHE_TTL: number;
    private readonly TRANSACTION_LIST_CACHE_TTL: number;

    constructor(
        private readonly repository: AccountBalanceRepository,
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
            module: 'AccountBalance',
            action: 'deposit.request',
            message: `Organization ${organizationId} yêu cầu nạp ${dto.amount} VND bởi user ${userId}`,
            userId,
            metaData: { organizationId, amount: dto.amount, notes: dto.notes },
        });

        // Return placeholder - sẽ được gọi từ controller qua SepayService
        throw new BadRequestException(
            await this.i18n.translate('account-balance.USE_DEPOSIT_ENDPOINT', { lang }),
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
            module: 'AccountBalance',
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
     * Lấy danh sách tất cả số dư (Admin)
     */
    async findAll(
        query: { limit?: number; offset?: number; keywords?: string },
        adminId: string,
        lang: string = 'vi',
    ): Promise<IPaginatedResponse<IOrganizationBalance>> {
        await this.systemLogService.log({
            level: 'INFO',
            module: 'AccountBalance',
            action: 'list.all',
            message: `Admin ${adminId} xem danh sách số dư tổ chức`,
            userId: adminId,
            metaData: query,
        });

        return this.repository.findAll(query);
    }

    /**
     * Lấy số dư của tổ chức cụ thể (Admin)
     */
    async findByOrganizationId(
        targetOrganizationId: string,
        adminId: string,
        lang: string = 'vi',
    ): Promise<IOrganizationBalance> {
        const balance = await this.repository.findByOrganizationId(targetOrganizationId);

        if (!balance) {
            throw new NotFoundException(
                await this.i18n.translate('account-balance.NOT_FOUND', { lang }),
            );
        }

        await this.systemLogService.log({
            level: 'INFO',
            module: 'AccountBalance',
            action: 'read',
            message: `Admin ${adminId} xem số dư của tổ chức ${targetOrganizationId}`,
            userId: adminId,
            metaData: { targetOrganizationId },
        });

        return balance;
    }

    /**
     * Điều chỉnh số dư (Admin)
     */
    async adjustBalance(
        targetOrganizationId: string,
        dto: AdjustBalanceDto,
        adminId: string,
        lang: string = 'vi',
    ): Promise<{ balance: IOrganizationBalance; transaction: IOrganizationBalanceTransaction }> {
        const transactionType = dto.type as BalanceTransactionType;

        const result = await this.repository.updateBalance(
            targetOrganizationId,
            transactionType,
            dto.amount,
            adminId,
            {
                description: dto.description,
                notes: dto.notes,
                metadata: { adjustedBy: adminId },
            },
        );

        await this.invalidateOrganizationCache(targetOrganizationId);

        // Emit realtime events
        this.websocketGateway.server.to(`organization:${targetOrganizationId}`).emit('organizationBalance:updated', {
            organizationId: targetOrganizationId,
            balance: result.balance.balance,
            type: dto.type,
            amount: dto.amount,
            adjustedBy: adminId,
            timestamp: new Date().toISOString(),
        });

        await this.systemLogService.log({
            level: 'INFO',
            module: 'AccountBalance',
            action: 'adjust',
            message: `Admin ${adminId} điều chỉnh số dư tổ chức ${targetOrganizationId}: ${dto.type} ${dto.amount} VND`,
            userId: adminId,
            metaData: {
                targetOrganizationId,
                type: dto.type,
                amount: dto.amount,
                description: dto.description,
                newBalance: result.balance.balance,
            },
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
