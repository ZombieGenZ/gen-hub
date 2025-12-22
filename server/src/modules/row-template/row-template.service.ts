import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { RowTemplateRepository } from './row-template.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateRowTemplateDto, UpdateRowTemplateDto, QueryRowTemplateDto } from './dto';
import { IPaginatedResponse } from './interfaces';

/**
 * Service xử lý business logic cho RowTemplate
 */
@Injectable()
export class RowTemplateService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: RowTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_ROW_TEMPLATE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_ROW_TEMPLATE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `row-template:${id}`;
    }

    private getListCacheKey(warehouseTemplateId: string, query: QueryRowTemplateDto): string {
        return `row-template:list:${warehouseTemplateId}:${JSON.stringify(query)}`;
    }

    /**
     * Tạo mới RowTemplate
     */
    async create(
        warehouseTemplateId: string,
        dto: CreateRowTemplateDto,
        userId: string,
        lang: string,
    ) {
        // Kiểm tra warehouse template tồn tại
        const warehouseExists = await this.repository.warehouseTemplateExists(warehouseTemplateId);
        if (!warehouseExists) {
            throw new NotFoundException(
                this.i18n.t('row-template.errors.warehouse_template_not_found', { lang }),
            );
        }

        // Kiểm tra code trùng
        const existingCode = await this.repository.findByCode(warehouseTemplateId, dto.code);
        if (existingCode) {
            throw new ConflictException(
                this.i18n.t('row-template.errors.code_exists', { lang }),
            );
        }

        // Chuẩn bị data tạo row
        const { discount_configs, ...rowData } = dto;

        const createData: Prisma.RowTemplateCreateInput = {
            ...rowData,
            price_per_month: new Decimal(dto.price_per_month),
            latitude: dto.latitude ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude ? new Decimal(dto.longitude) : undefined,
            position_x: dto.position_x ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y ? new Decimal(dto.position_y) : undefined,
            position_rotation: dto.position_rotation ? new Decimal(dto.position_rotation) : undefined,
            is_active: dto.is_active ?? true,
            is_rented: dto.is_rented ?? false,
            created_by: userId,
            warehouse_template: { connect: { id: warehouseTemplateId } },
            ...(discount_configs && discount_configs.length > 0 && {
                discount_configs: {
                    create: discount_configs.map(config => ({
                        duration_tier: { connect: { id: config.duration_tier_id } },
                        discount_percent: new Decimal(config.discount_percent),
                        is_active: config.is_active ?? true,
                        created_by: userId,
                    })),
                },
            }),
        };

        const row = await this.repository.create(createData);

        // Invalidate list cache
        await this.invalidateListCache(warehouseTemplateId);

        // Log
        this.systemLogService.info('RowTemplate', 'CREATE', `Tạo dãy: ${row.name}`, {
            userId,
            metaData: { rowId: row.id, warehouseTemplateId, name: row.name, code: row.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rowTemplate:created', {
            warehouseTemplateId,
            rowId: row.id,
            name: row.name,
            code: row.code,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return row;
    }

    /**
     * Lấy danh sách RowTemplate
     */
    async findMany(
        warehouseTemplateId: string,
        query: QueryRowTemplateDto,
        lang: string,
    ): Promise<IPaginatedResponse<any>> {
        // Kiểm tra warehouse template tồn tại
        const warehouseExists = await this.repository.warehouseTemplateExists(warehouseTemplateId);
        if (!warehouseExists) {
            throw new NotFoundException(
                this.i18n.t('row-template.errors.warehouse_template_not_found', { lang }),
            );
        }

        // Check cache
        const cacheKey = this.getListCacheKey(warehouseTemplateId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findMany(warehouseTemplateId, query);

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    /**
     * Lấy chi tiết RowTemplate
     */
    async findById(id: string, lang: string) {
        // Check cache
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const row = await this.repository.findById(id);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('row-template.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(row), this.cacheTTL);

        return row;
    }

    /**
     * Cập nhật RowTemplate
     */
    async update(
        id: string,
        dto: UpdateRowTemplateDto,
        userId: string,
        lang: string,
    ) {
        const row = await this.repository.findById(id);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('row-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra code trùng nếu đang cập nhật code
        if (dto.code && dto.code !== row.code) {
            const existing = await this.repository.findByCode(row.warehouse_template_id, dto.code, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('row-template.errors.code_exists', { lang }),
                );
            }
        }

        const { discount_configs, ...rowData } = dto;

        // Xử lý discount configs
        if (discount_configs !== undefined) {
            await this.upsertDiscountConfigs(id, discount_configs, userId);
        }

        // Update row
        const updateData: Prisma.RowTemplateUpdateInput = {
            ...rowData,
            price_per_month: dto.price_per_month !== undefined ? new Decimal(dto.price_per_month) : undefined,
            latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
            position_x: dto.position_x !== undefined ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y !== undefined ? new Decimal(dto.position_y) : undefined,
            position_rotation: dto.position_rotation !== undefined ? new Decimal(dto.position_rotation) : undefined,
            updated_by: userId,
        };

        const updated = await this.repository.update(id, updateData);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(row.warehouse_template_id);

        // Log
        this.systemLogService.info('RowTemplate', 'UPDATE', `Cập nhật dãy: ${updated.name}`, {
            userId,
            metaData: { rowId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rowTemplate:updated', {
            warehouseTemplateId: row.warehouse_template_id,
            rowId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    /**
     * Xóa RowTemplate
     */
    async delete(id: string, userId: string, lang: string) {
        const row = await this.repository.findById(id);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('row-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(row.warehouse_template_id);

        // Log
        this.systemLogService.info('RowTemplate', 'DELETE', `Xóa dãy: ${row.name}`, {
            userId,
            metaData: { rowId: id, name: row.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rowTemplate:deleted', {
            warehouseTemplateId: row.warehouse_template_id,
            rowId: id,
            name: row.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Xóa nhiều RowTemplate
     */
    async deleteMany(ids: string[], userId: string, lang: string) {
        const rows = await this.repository.findByIds(ids);
        if (rows.length === 0) {
            throw new NotFoundException(
                this.i18n.t('row-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        const warehouseTemplateIds = new Set(rows.map(r => r.warehouse_template_id));
        await Promise.all([
            ...ids.map(id => this.invalidateCache(id)),
            ...Array.from(warehouseTemplateIds).map(wtId => this.invalidateListCache(wtId)),
        ]);

        // Log
        rows.forEach(row => {
            this.systemLogService.info('RowTemplate', 'DELETE', `Xóa dãy: ${row.name}`, {
                userId,
                metaData: { rowId: row.id, name: row.name },
            });
        });

        // Emit socket event
        this.websocketGateway.server.emit('rowTemplate:deletedMany', {
            rowIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Upsert discount configs cho row
     */
    private async upsertDiscountConfigs(
        rowId: string,
        newConfigs: UpdateRowTemplateDto['discount_configs'],
        userId: string,
    ) {
        if (!newConfigs) return;

        const existingConfigs = await this.repository.findDiscountConfigs(rowId);
        const existingConfigIds = new Set(existingConfigs.map(c => c.id));

        const configsToCreate: Prisma.RowDiscountConfigCreateManyInput[] = [];
        const configsToUpdate: { id: string; data: Prisma.RowDiscountConfigUpdateInput }[] = [];
        const requestConfigIds = new Set<string>();

        // De-dupe by duration_tier_id
        const uniqueMap = new Map<string, typeof newConfigs[0]>();
        for (const config of newConfigs) {
            uniqueMap.set(config.duration_tier_id, config);
        }

        for (const config of uniqueMap.values()) {
            if (config.id && existingConfigIds.has(config.id)) {
                requestConfigIds.add(config.id);
                configsToUpdate.push({
                    id: config.id,
                    data: {
                        discount_percent: new Decimal(config.discount_percent),
                        is_active: config.is_active,
                        updated_by: userId,
                    },
                });
            } else {
                configsToCreate.push({
                    row_template_id: rowId,
                    duration_tier_id: config.duration_tier_id,
                    discount_percent: new Decimal(config.discount_percent),
                    is_active: config.is_active ?? true,
                    created_by: userId,
                });
            }
        }

        const configIdsToDelete = existingConfigs
            .filter(c => !requestConfigIds.has(c.id))
            .map(c => c.id);

        await this.repository.upsertDiscountConfigs(
            rowId,
            configsToCreate,
            configsToUpdate,
            configIdsToDelete,
            userId,
        );
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache(warehouseTemplateId: string) {
        await this.redisService.delByPattern(`row-template:list:${warehouseTemplateId}:*`);
        // Cũng invalidate cache của warehouse template để đảm bảo data nhất quán
        await this.redisService.del(`warehouse-template:${warehouseTemplateId}`);
        await this.redisService.delByPattern('warehouse-template:list:*');
    }
}
