import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { BalanceTransactionType } from '@prisma/client';

import { OrganizationBalanceAdminRepository } from './organization-balance-admin.repository';
import { AdjustBalanceDto } from './dto';
import { IOrganizationBalance, IOrganizationBalanceTransaction, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';

@Injectable()
export class OrganizationBalanceAdminService {
    private readonly BALANCE_CACHE_TTL: number;

    constructor(
        private readonly repository: OrganizationBalanceAdminRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly i18n: I18nService,
    ) {
        this.BALANCE_CACHE_TTL = this.configService.get<number>('REDIS_ACCOUNT_BALANCE_CACHE_TTL') || 300;
    }

    private getBalanceCacheKey(organizationId: string): string {
        return `organization_balance:${organizationId}`;
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
            module: 'OrganizationBalance',
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
                await this.i18n.translate('organization-balance.NOT_FOUND', { lang }),
            );
        }

        await this.systemLogService.log({
            level: 'INFO',
            module: 'OrganizationBalance',
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
            module: 'OrganizationBalance',
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
    private async invalidateOrganizationCache(organizationId: string): Promise<void> {
        await this.redisService.del(this.getBalanceCacheKey(organizationId));
        await this.redisService.delByPattern(`organization_balance_transactions:${organizationId}:*`);
    }
}
