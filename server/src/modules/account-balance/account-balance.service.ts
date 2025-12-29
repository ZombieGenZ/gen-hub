import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { BalanceTransactionType } from '@prisma/client';

import { AccountBalanceRepository } from './account-balance.repository';
import { CreateDepositDto, AdjustBalanceDto, QueryBalanceTransactionDto } from './dto';
import { IAccountBalance, IBalanceTransaction, IPaginatedResponse } from './interfaces';
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

    private getBalanceCacheKey(userId: string): string {
        return `account_balance:${userId}`;
    }

    private getTransactionListCacheKey(userId: string, query: QueryBalanceTransactionDto): string {
        return `balance_transactions:${userId}:${JSON.stringify(query)}`;
    }

    /**
     * Lấy số dư của user hiện tại
     */
    async getMyBalance(userId: string, lang: string = 'vi'): Promise<IAccountBalance> {
        const cacheKey = this.getBalanceCacheKey(userId);
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const balance = await this.repository.getOrCreateByUserId(userId);
        await this.redisService.set(cacheKey, JSON.stringify(balance), this.BALANCE_CACHE_TTL);

        return balance;
    }

    /**
     * Lấy lịch sử giao dịch của user hiện tại
     */
    async getMyTransactions(
        userId: string,
        query: QueryBalanceTransactionDto,
        lang: string = 'vi',
    ): Promise<IPaginatedResponse<IBalanceTransaction>> {
        const cacheKey = this.getTransactionListCacheKey(userId, query);
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findTransactionsByUserId(userId, query);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.TRANSACTION_LIST_CACHE_TTL);

        return result;
    }

    /**
     * Nạp tiền vào tài khoản - Tạo payment request
     * Lưu ý: Số dư chỉ được cộng sau khi thanh toán thành công (webhook)
     */
    async createDepositRequest(
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
            message: `User ${userId} yêu cầu nạp ${dto.amount} VND`,
            userId,
            metaData: { amount: dto.amount, notes: dto.notes },
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
        userId: string,
        amount: number,
        paymentId: string,
        paymentCode: string,
    ): Promise<{ balance: IAccountBalance; transaction: IBalanceTransaction }> {
        const result = await this.repository.updateBalance(
            userId,
            BalanceTransactionType.DEPOSIT,
            amount,
            {
                referenceType: 'payment',
                referenceId: paymentId,
                description: `Nạp tiền qua thanh toán ${paymentCode}`,
            },
        );

        // Invalidate cache
        await this.invalidateUserCache(userId);

        // Emit realtime event
        this.websocketGateway.server.to(`user:${userId}`).emit('accountBalance:updated', {
            userId,
            balance: result.balance.balance,
            type: 'DEPOSIT',
            amount,
            timestamp: new Date().toISOString(),
        });

        this.websocketGateway.server.to(`user:${userId}`).emit('balanceTransaction:created', {
            userId,
            transaction: result.transaction,
            timestamp: new Date().toISOString(),
        });

        this.websocketGateway.server.to(`user:${userId}`).emit('deposit:completed', {
            userId,
            amount,
            newBalance: result.balance.balance,
            paymentCode,
            timestamp: new Date().toISOString(),
        });

        await this.systemLogService.log({
            level: 'INFO',
            module: 'AccountBalance',
            action: 'deposit.success',
            message: `User ${userId} nạp thành công ${amount} VND`,
            userId,
            metaData: { amount, paymentId, paymentCode, newBalance: result.balance.balance },
        });

        return result;
    }

    /**
     * Trừ tiền khi thanh toán (internal use)
     */
    async processPayment(
        userId: string,
        amount: number,
        referenceType: string,
        referenceId: string,
        description: string,
    ): Promise<{ balance: IAccountBalance; transaction: IBalanceTransaction }> {
        // Kiểm tra số dư
        const currentBalance = await this.repository.getOrCreateByUserId(userId);
        if (currentBalance.balance < amount) {
            throw new BadRequestException('Số dư không đủ');
        }

        const result = await this.repository.updateBalance(
            userId,
            BalanceTransactionType.PAYMENT,
            amount,
            {
                referenceType,
                referenceId,
                description,
            },
        );

        await this.invalidateUserCache(userId);

        this.websocketGateway.server.to(`user:${userId}`).emit('accountBalance:updated', {
            userId,
            balance: result.balance.balance,
            type: 'PAYMENT',
            amount: -amount,
            timestamp: new Date().toISOString(),
        });

        return result;
    }

    // ====== ADMIN FUNCTIONS ======

    /**
     * Lấy danh sách tất cả số dư (Admin)
     */
    async findAll(
        query: { limit?: number; offset?: number; keywords?: string },
        adminId: string,
        lang: string = 'vi',
    ): Promise<IPaginatedResponse<IAccountBalance>> {
        await this.systemLogService.log({
            level: 'INFO',
            module: 'AccountBalance',
            action: 'list.all',
            message: `Admin ${adminId} xem danh sách số dư`,
            userId: adminId,
            metaData: query,
        });

        return this.repository.findAll(query);
    }

    /**
     * Lấy số dư của user cụ thể (Admin)
     */
    async findByUserId(
        targetUserId: string,
        adminId: string,
        lang: string = 'vi',
    ): Promise<IAccountBalance> {
        const balance = await this.repository.findByUserId(targetUserId);

        if (!balance) {
            throw new NotFoundException(
                await this.i18n.translate('account-balance.NOT_FOUND', { lang }),
            );
        }

        await this.systemLogService.log({
            level: 'INFO',
            module: 'AccountBalance',
            action: 'read',
            message: `Admin ${adminId} xem số dư của user ${targetUserId}`,
            userId: adminId,
            metaData: { targetUserId },
        });

        return balance;
    }

    /**
     * Điều chỉnh số dư (Admin)
     */
    async adjustBalance(
        targetUserId: string,
        dto: AdjustBalanceDto,
        adminId: string,
        lang: string = 'vi',
    ): Promise<{ balance: IAccountBalance; transaction: IBalanceTransaction }> {
        const transactionType = dto.type as BalanceTransactionType;

        const result = await this.repository.updateBalance(
            targetUserId,
            transactionType,
            dto.amount,
            {
                description: dto.description,
                notes: dto.notes,
                metadata: { adjustedBy: adminId },
            },
        );

        await this.invalidateUserCache(targetUserId);

        // Emit realtime events
        this.websocketGateway.server.to(`user:${targetUserId}`).emit('accountBalance:updated', {
            userId: targetUserId,
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
            message: `Admin ${adminId} điều chỉnh số dư user ${targetUserId}: ${dto.type} ${dto.amount} VND`,
            userId: adminId,
            metaData: {
                targetUserId,
                type: dto.type,
                amount: dto.amount,
                description: dto.description,
                newBalance: result.balance.balance,
            },
        });

        return result;
    }

    /**
     * Invalidate cache của user
     */
    private async invalidateUserCache(userId: string): Promise<void> {
        await this.redisService.del(this.getBalanceCacheKey(userId));
        await this.redisService.delByPattern(`balance_transactions:${userId}:*`);
    }
}
