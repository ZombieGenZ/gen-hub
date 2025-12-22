import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

import { RackTemplateRepository } from './rack-template.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateRackTemplateDto, UpdateRackTemplateDto, QueryRackTemplateDto } from './dto';
import { IPaginatedResponse } from './interfaces';

/**
 * Service xử lý business logic cho RackTemplate
 */
@Injectable()
export class RackTemplateService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: RackTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_RACK_TEMPLATE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_RACK_TEMPLATE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `rack-template:${id}`;
    }

    private getListCacheKey(rowTemplateId: string, query: QueryRackTemplateDto): string {
        return `rack-template:list:${rowTemplateId}:${JSON.stringify(query)}`;
    }

    /**
     * Tạo mới RackTemplate
     */
    async create(
        rowTemplateId: string,
        dto: CreateRackTemplateDto,
        userId: string,
        lang: string,
    ) {
        // Kiểm tra row template tồn tại
        const row = await this.repository.rowTemplateExists(rowTemplateId);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('rack-template.errors.row_template_not_found', { lang }),
            );
        }

        // Kiểm tra code trùng
        const existingCode = await this.repository.findByCode(rowTemplateId, dto.code);
        if (existingCode) {
            throw new ConflictException(
                this.i18n.t('rack-template.errors.code_exists', { lang }),
            );
        }

        const createData: Prisma.RackTemplateCreateInput = {
            ...dto,
            default_block_max_weight_capacity: dto.default_block_max_weight_capacity ? new Decimal(dto.default_block_max_weight_capacity) : undefined,
            overload_threshold_percent: dto.overload_threshold_percent ? new Decimal(dto.overload_threshold_percent) : undefined,
            position_x: dto.position_x ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y ? new Decimal(dto.position_y) : undefined,
            position_rotation: dto.position_rotation ? new Decimal(dto.position_rotation) : undefined,
            is_active: dto.is_active ?? true,
            created_by: userId,
            row_template: { connect: { id: rowTemplateId } },
        };

        const rack = await this.repository.create(createData);

        // Invalidate caches
        await this.invalidateListCache(rowTemplateId);
        await this.invalidateParentCaches(row.warehouse_template_id, rowTemplateId);

        // Log
        this.systemLogService.info('RackTemplate', 'CREATE', `Tạo kệ: ${rack.name}`, {
            userId,
            metaData: { rackId: rack.id, rowTemplateId, name: rack.name, code: rack.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rackTemplate:created', {
            rowTemplateId,
            rackId: rack.id,
            name: rack.name,
            code: rack.code,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return rack;
    }

    /**
     * Lấy danh sách RackTemplate
     */
    async findMany(
        rowTemplateId: string,
        query: QueryRackTemplateDto,
        lang: string,
    ): Promise<IPaginatedResponse<any>> {
        // Kiểm tra row template tồn tại
        const row = await this.repository.rowTemplateExists(rowTemplateId);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('rack-template.errors.row_template_not_found', { lang }),
            );
        }

        // Check cache
        const cacheKey = this.getListCacheKey(rowTemplateId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findMany(rowTemplateId, query);

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    /**
     * Lấy chi tiết RackTemplate
     */
    async findById(id: string, lang: string) {
        // Check cache
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const rack = await this.repository.findById(id);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('rack-template.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(rack), this.cacheTTL);

        return rack;
    }

    /**
     * Cập nhật RackTemplate
     */
    async update(
        id: string,
        dto: UpdateRackTemplateDto,
        userId: string,
        lang: string,
    ) {
        const rack = await this.repository.findById(id);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('rack-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra code trùng nếu đang cập nhật code
        if (dto.code && dto.code !== rack.code) {
            const existing = await this.repository.findByCode(rack.row_template_id, dto.code, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('rack-template.errors.code_exists', { lang }),
                );
            }
        }

        const updateData: Prisma.RackTemplateUpdateInput = {
            ...dto,
            default_block_max_weight_capacity: dto.default_block_max_weight_capacity !== undefined ? new Decimal(dto.default_block_max_weight_capacity) : undefined,
            overload_threshold_percent: dto.overload_threshold_percent !== undefined ? new Decimal(dto.overload_threshold_percent) : undefined,
            position_x: dto.position_x !== undefined ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y !== undefined ? new Decimal(dto.position_y) : undefined,
            position_rotation: dto.position_rotation !== undefined ? new Decimal(dto.position_rotation) : undefined,
            updated_by: userId,
        };

        const updated = await this.repository.update(id, updateData);

        // Get parent info
        const row = await this.repository.rowTemplateExists(rack.row_template_id);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(rack.row_template_id);
        if (row) {
            await this.invalidateParentCaches(row.warehouse_template_id, rack.row_template_id);
        }

        // Log
        this.systemLogService.info('RackTemplate', 'UPDATE', `Cập nhật kệ: ${updated.name}`, {
            userId,
            metaData: { rackId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rackTemplate:updated', {
            rowTemplateId: rack.row_template_id,
            rackId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    /**
     * Xóa RackTemplate
     */
    async delete(id: string, userId: string, lang: string) {
        const rack = await this.repository.findById(id);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('rack-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Get parent info
        const row = await this.repository.rowTemplateExists(rack.row_template_id);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(rack.row_template_id);
        if (row) {
            await this.invalidateParentCaches(row.warehouse_template_id, rack.row_template_id);
        }

        // Log
        this.systemLogService.info('RackTemplate', 'DELETE', `Xóa kệ: ${rack.name}`, {
            userId,
            metaData: { rackId: id, name: rack.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('rackTemplate:deleted', {
            rowTemplateId: rack.row_template_id,
            rackId: id,
            name: rack.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Xóa nhiều RackTemplate
     */
    async deleteMany(ids: string[], userId: string, lang: string) {
        const racks = await this.repository.findByIds(ids);
        if (racks.length === 0) {
            throw new NotFoundException(
                this.i18n.t('rack-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate caches
        const rowTemplateIds = new Set(racks.map(r => r.row_template_id));
        await Promise.all([
            ...ids.map(id => this.invalidateCache(id)),
            ...Array.from(rowTemplateIds).map(rowId => this.invalidateListCache(rowId)),
        ]);

        // Log
        racks.forEach(rack => {
            this.systemLogService.info('RackTemplate', 'DELETE', `Xóa kệ: ${rack.name}`, {
                userId,
                metaData: { rackId: rack.id, name: rack.name },
            });
        });

        // Emit socket event
        this.websocketGateway.server.emit('rackTemplate:deletedMany', {
            rackIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache(rowTemplateId: string) {
        await this.redisService.delByPattern(`rack-template:list:${rowTemplateId}:*`);
    }

    private async invalidateParentCaches(warehouseTemplateId: string, rowTemplateId: string) {
        await Promise.all([
            this.redisService.del(`row-template:${rowTemplateId}`),
            this.redisService.delByPattern(`row-template:list:${warehouseTemplateId}:*`),
            this.redisService.del(`warehouse-template:${warehouseTemplateId}`),
            this.redisService.delByPattern('warehouse-template:list:*'),
        ]);
    }
}
