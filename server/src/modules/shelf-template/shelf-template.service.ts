import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import Decimal = Prisma.Decimal;

import { ShelfTemplateRepository } from './shelf-template.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateShelfTemplateDto, UpdateShelfTemplateDto, QueryShelfTemplateDto } from './dto';
import { IPaginatedResponse } from './interfaces';

/**
 * Service xử lý business logic cho ShelfTemplate
 */
@Injectable()
export class ShelfTemplateService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: ShelfTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_SHELF_TEMPLATE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_SHELF_TEMPLATE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        const prefix = this.configService.get<string>('REDIS_SHELF_TEMPLATE_KEY_PREFIX', 'shelf-template');
        return `${prefix}:${id}`;
    }

    private getListCacheKey(rackTemplateId: string, query: QueryShelfTemplateDto): string {
        const prefix = this.configService.get<string>('REDIS_SHELF_TEMPLATE_LIST_KEY_PREFIX', 'shelf-template:list');
        return `${prefix}:${rackTemplateId}:${JSON.stringify(query)}`;
    }

    /**
     * Tạo mới ShelfTemplate
     */
    async create(
        rackTemplateId: string,
        dto: CreateShelfTemplateDto,
        userId: string,
        lang: string,
    ) {
        // Kiểm tra rack template tồn tại
        const rack = await this.repository.rackTemplateExists(rackTemplateId);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.rack_template_not_found', { lang }),
            );
        }

        // Kiểm tra code trùng
        const existingCode = await this.repository.findByCode(rackTemplateId, dto.code);
        if (existingCode) {
            throw new ConflictException(
                this.i18n.t('shelf-template.errors.code_exists', { lang }),
            );
        }

        const createData: Prisma.ShelfTemplateCreateInput = {
            name: dto.name,
            code: dto.code,
            description: dto.description,
            height: dto.height ? new Decimal(dto.height) : undefined,
            is_active: dto.is_active ?? true,
            created_by: userId,
            rack_template: { connect: { id: rackTemplateId } },
        };

        const shelf = await this.repository.create(createData);

        // Invalidate caches
        await this.invalidateListCache(rackTemplateId);
        await this.invalidateParentCaches(
            rack.row_template.warehouse_template_id,
            rack.row_template_id,
            rackTemplateId,
        );

        // Log
        const logMessage = await this.i18n.translate('shelf-template.logs.created', {
            lang,
            args: { name: shelf.name },
        });
        this.systemLogService.info('ShelfTemplate', 'CREATE', logMessage, {
            userId,
            metaData: { shelfId: shelf.id, rackTemplateId, name: shelf.name, code: shelf.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('shelfTemplate:created', {
            rackTemplateId,
            shelfId: shelf.id,
            name: shelf.name,
            code: shelf.code,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return shelf;
    }

    /**
     * Lấy danh sách ShelfTemplate
     */
    async findMany(
        rackTemplateId: string,
        query: QueryShelfTemplateDto,
        lang: string,
        ownerId?: string,
    ): Promise<IPaginatedResponse<any>> {
        // Kiểm tra rack template tồn tại
        const rack = await this.repository.rackTemplateExists(rackTemplateId);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.rack_template_not_found', { lang }),
            );
        }

        // Check ownership if ownerId is provided
        if (ownerId && rack.row_template.warehouse_template.created_by !== ownerId) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.rack_template_not_found', { lang }),
            );
        }

        // Check cache
        const cacheKey = this.getListCacheKey(rackTemplateId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findMany(rackTemplateId, query);

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    /**
     * Lấy chi tiết ShelfTemplate
     */
    async findById(id: string, lang: string, ownerId?: string) {
        // Check cache
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const shelf = await this.repository.findById(id);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.not_found', { lang }),
            );
        }

        // Check ownership if ownerId is provided
        if (ownerId) {
            const rack = await this.repository.rackTemplateExists(shelf.rack_template_id);
            if (!rack || rack.row_template.warehouse_template.created_by !== ownerId) {
                throw new NotFoundException(
                    this.i18n.t('shelf-template.errors.not_found', { lang }),
                );
            }
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(shelf), this.cacheTTL);

        return shelf;
    }

    /**
     * Cập nhật ShelfTemplate
     */
    async update(
        id: string,
        dto: UpdateShelfTemplateDto,
        userId: string,
        lang: string,
        ownerId?: string,
    ) {
        const shelf = await this.repository.findById(id);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.not_found', { lang }),
            );
        }

        // Check ownership if ownerId is provided
        if (ownerId) {
            const rack = await this.repository.rackTemplateExists(shelf.rack_template_id);
            if (!rack || rack.row_template.warehouse_template.created_by !== ownerId) {
                throw new NotFoundException(
                    this.i18n.t('shelf-template.errors.not_found', { lang }),
                );
            }
        }

        // Kiểm tra code trùng nếu đang cập nhật code
        if (dto.code && dto.code !== shelf.code) {
            const existing = await this.repository.findByCode(shelf.rack_template_id, dto.code, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('shelf-template.errors.code_exists', { lang }),
                );
            }
        }

        const updateData: Prisma.ShelfTemplateUpdateInput = {
            name: dto.name,
            code: dto.code,
            description: dto.description,
            height: dto.height !== undefined ? new Decimal(dto.height) : undefined,
            is_active: dto.is_active,
            updated_by: userId,
        };

        const updated = await this.repository.update(id, updateData);

        // Get parent info
        const rack = await this.repository.rackTemplateExists(shelf.rack_template_id);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(shelf.rack_template_id);
        if (rack) {
            await this.invalidateParentCaches(
                rack.row_template.warehouse_template_id,
                rack.row_template_id,
                shelf.rack_template_id,
            );
        }

        // Log
        const logMessage = await this.i18n.translate('shelf-template.logs.updated', {
            lang,
            args: { name: updated.name },
        });
        this.systemLogService.info('ShelfTemplate', 'UPDATE', logMessage, {
            userId,
            metaData: { shelfId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('shelfTemplate:updated', {
            rackTemplateId: shelf.rack_template_id,
            shelfId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    /**
     * Xóa ShelfTemplate
     */
    async delete(id: string, userId: string, lang: string, ownerId?: string) {
        const shelf = await this.repository.findById(id);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.not_found', { lang }),
            );
        }

        // Check ownership if ownerId is provided
        if (ownerId) {
            const rack = await this.repository.rackTemplateExists(shelf.rack_template_id);
            if (!rack || rack.row_template.warehouse_template.created_by !== ownerId) {
                throw new NotFoundException(
                    this.i18n.t('shelf-template.errors.not_found', { lang }),
                );
            }
        }

        await this.repository.softDelete(id, userId);

        // Get parent info
        const rack = await this.repository.rackTemplateExists(shelf.rack_template_id);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(shelf.rack_template_id);
        if (rack) {
            await this.invalidateParentCaches(
                rack.row_template.warehouse_template_id,
                rack.row_template_id,
                shelf.rack_template_id,
            );
        }

        // Log
        const logMessage = await this.i18n.translate('shelf-template.logs.deleted', {
            lang,
            args: { name: shelf.name },
        });
        this.systemLogService.info('ShelfTemplate', 'DELETE', logMessage, {
            userId,
            metaData: { shelfId: id, name: shelf.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('shelfTemplate:deleted', {
            rackTemplateId: shelf.rack_template_id,
            shelfId: id,
            name: shelf.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Xóa nhiều ShelfTemplate
     */
    async deleteMany(ids: string[], userId: string, lang: string) {
        const shelves = await this.repository.findByIds(ids);
        if (shelves.length === 0) {
            throw new NotFoundException(
                this.i18n.t('shelf-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate caches
        const rackTemplateIds = new Set(shelves.map(s => s.rack_template_id));
        await Promise.all([
            ...ids.map(id => this.invalidateCache(id)),
            ...Array.from(rackTemplateIds).map(rackId => this.invalidateListCache(rackId)),
        ]);

        // Log
        shelves.forEach(async (shelf) => {
            const logMessage = await this.i18n.translate('shelf-template.logs.deleted', {
                lang,
                args: { name: shelf.name },
            });
            this.systemLogService.info('ShelfTemplate', 'DELETE', logMessage, {
                userId,
                metaData: { shelfId: shelf.id, name: shelf.name },
            });
        });

        // Emit socket event
        this.websocketGateway.server.emit('shelfTemplate:deletedMany', {
            shelfIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache(rackTemplateId: string) {
        const listPrefix = this.configService.get<string>('REDIS_SHELF_TEMPLATE_LIST_KEY_PREFIX', 'shelf-template:list');
        await this.redisService.delByPattern(`${listPrefix}:${rackTemplateId}:*`);
    }

    private async invalidateParentCaches(
        warehouseTemplateId: string,
        rowTemplateId: string,
        rackTemplateId: string,
    ) {
        const rackPrefix = this.configService.get<string>('REDIS_RACK_TEMPLATE_KEY_PREFIX', 'rack-template');
        const rackListPrefix = this.configService.get<string>('REDIS_RACK_TEMPLATE_LIST_KEY_PREFIX', 'rack-template:list');
        const rowPrefix = this.configService.get<string>('REDIS_ROW_TEMPLATE_KEY_PREFIX', 'row-template');
        const rowListPrefix = this.configService.get<string>('REDIS_ROW_TEMPLATE_LIST_KEY_PREFIX', 'row-template:list');
        const warehousePrefix = this.configService.get<string>('REDIS_WAREHOUSE_TEMPLATE_KEY_PREFIX', 'warehouse-template');
        const warehouseListPrefix = this.configService.get<string>('REDIS_WAREHOUSE_TEMPLATE_LIST_KEY_PREFIX', 'warehouse-template:list');

        await Promise.all([
            this.redisService.del(`${rackPrefix}:${rackTemplateId}`),
            this.redisService.delByPattern(`${rackListPrefix}:${rowTemplateId}:*`),
            this.redisService.del(`${rowPrefix}:${rowTemplateId}`),
            this.redisService.delByPattern(`${rowListPrefix}:${warehouseTemplateId}:*`),
            this.redisService.del(`${warehousePrefix}:${warehouseTemplateId}`),
            this.redisService.delByPattern(`${warehouseListPrefix}:*`),
        ]);
    }
}
