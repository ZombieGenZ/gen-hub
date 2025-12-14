import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';

import { WarehouseRepository } from './warehouse.repository';
import { CreateWarehouseDto, UpdateWarehouseDto, QueryWarehouseDto } from './dto';
import { IWarehouseWithRelations, IPaginatedResponse, IWarehouseLayout } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';

/**
 * Service xử lý business logic cho Warehouse
 */
@Injectable()
export class WarehouseService {
    private readonly WAREHOUSE_CACHE_TTL: number;
    private readonly WAREHOUSE_LIST_CACHE_TTL: number;

    constructor(
        private readonly repository: WarehouseRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly auditLogService: OrganizationAuditLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.WAREHOUSE_CACHE_TTL = this.configService.get<number>('REDIS_WAREHOUSE_CACHE_TTL') || 300;
        this.WAREHOUSE_LIST_CACHE_TTL = this.configService.get<number>('REDIS_WAREHOUSE_LIST_CACHE_TTL') || 60;
    }

    /**
     * Lấy danh sách warehouse
     */
    async findMany(
        query: QueryWarehouseDto,
        userId: string,
    ): Promise<IPaginatedResponse<IWarehouseWithRelations>> {
        const queryParams: Record<string, unknown> = {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
            is_active: query.is_active,
            organization_id: query.organization_id,
        };
        const cacheKey = this.getWarehouseListCacheKey(queryParams);

        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const result = await this.repository.findMany(query);

        // Cache kết quả
        await this.redisService.set(cacheKey, JSON.stringify(result), this.WAREHOUSE_LIST_CACHE_TTL);

        return result;
    }

    /**
     * Lấy chi tiết warehouse
     */
    async findById(id: string, lang: string): Promise<IWarehouseWithRelations> {
        const cacheKey = this.getWarehouseCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache không hợp lệ
            }
        }

        const warehouse = await this.repository.findById(id);
        if (!warehouse) {
            throw new NotFoundException(
                this.i18n.t('warehouse.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(warehouse), this.WAREHOUSE_CACHE_TTL);

        return warehouse;
    }

    /**
     * Cập nhật warehouse (chỉ name/description)
     */
    async update(
        id: string,
        dto: UpdateWarehouseDto,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<IWarehouseWithRelations> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse.errors.not_found', { lang }),
            );
        }

        // Kiểm tra quyền (phải thuộc organization)
        if (existing.organization_id !== organizationId) {
            throw new ForbiddenException(
                this.i18n.t('warehouse.errors.no_permission', { lang }),
            );
        }

        const updatedFields = Object.keys(dto);
        const oldData = { name: existing.name, description: existing.description };

        const warehouse = await this.repository.update(id, {
            ...dto,
            updated_by: userId,
        });

        // Invalidate caches
        await Promise.all([
            this.invalidateWarehouseCache(id),
            this.invalidateWarehouseListCache(),
        ]);

        // Log
        this.systemLogService.info('warehouse', 'update', `Updated warehouse: ${warehouse.name}`, {
            userId,
            metaData: { warehouseId: id, updatedFields },
        });

        // Audit log
        this.auditLogService.logUpdate(
            organizationId,
            'warehouse',
            id,
            oldData as Record<string, unknown>,
            dto as Record<string, unknown>,
            { userId, description: `Updated warehouse: ${warehouse.name}` },
        );

        return warehouse;
    }

    /**
     * Xóa warehouse (soft delete)
     */
    async delete(
        id: string,
        userId: string,
        organizationId: string,
        lang: string,
    ): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse.errors.not_found', { lang }),
            );
        }

        if (existing.organization_id !== organizationId) {
            throw new ForbiddenException(
                this.i18n.t('warehouse.errors.no_permission', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate caches
        await Promise.all([
            this.invalidateWarehouseCache(id),
            this.invalidateWarehouseListCache(),
        ]);

        // Log
        this.systemLogService.info('warehouse', 'delete', `Deleted warehouse: ${existing.name}`, {
            userId,
            metaData: { warehouseId: id, name: existing.name },
        });

        // Audit log
        this.auditLogService.logDelete(
            organizationId,
            'warehouse',
            id,
            { name: existing.name } as Record<string, unknown>,
            { userId, description: `Deleted warehouse: ${existing.name}` },
        );
    }

    /**
     * Lấy layout warehouse
     */
    async getLayout(id: string, lang: string): Promise<IWarehouseLayout> {
        const layout = await this.repository.getLayout(id);
        if (!layout) {
            throw new NotFoundException(
                this.i18n.t('warehouse.errors.not_found', { lang }),
            );
        }
        return layout;
    }

    // Private helper methods
    private getWarehouseCacheKey(id: string): string {
        return `warehouse:${id}`;
    }

    private getWarehouseListCacheKey(query: Record<string, unknown>): string {
        const sortedParams = Object.keys(query)
            .sort()
            .map((key) => `${key}=${query[key]}`)
            .join('&');
        return `warehouse:list:${sortedParams}`;
    }

    private async invalidateWarehouseCache(id: string): Promise<void> {
        await this.redisService.del(this.getWarehouseCacheKey(id));
    }

    private async invalidateWarehouseListCache(): Promise<void> {
        await this.redisService.delByPattern('warehouse:list:*');
    }
}
