import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Prisma } from '@prisma/client';
import Decimal = Prisma.Decimal;

import { BlockTemplateRepository } from './block-template.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateBlockTemplateDto, UpdateBlockTemplateDto, QueryBlockTemplateDto } from './dto';
import { IPaginatedResponse } from './interfaces';

/**
 * Service xử lý business logic cho BlockTemplate
 */
@Injectable()
export class BlockTemplateService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: BlockTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_BLOCK_TEMPLATE_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_BLOCK_TEMPLATE_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        const prefix = this.configService.get<string>('REDIS_BLOCK_TEMPLATE_KEY_PREFIX', 'block-template');
        return `${prefix}:${id}`;
    }

    private getListCacheKey(shelfTemplateId: string, query: QueryBlockTemplateDto): string {
        const prefix = this.configService.get<string>('REDIS_BLOCK_TEMPLATE_LIST_KEY_PREFIX', 'block-template:list');
        return `${prefix}:${shelfTemplateId}:${JSON.stringify(query)}`;
    }

    /**
     * Tạo mới BlockTemplate
     */
    async create(
        shelfTemplateId: string,
        dto: CreateBlockTemplateDto,
        userId: string,
        lang: string,
    ) {
        // Kiểm tra shelf template tồn tại
        const shelf = await this.repository.shelfTemplateExists(shelfTemplateId);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('block-template.errors.shelf_template_not_found', { lang }),
            );
        }

        // Kiểm tra code trùng
        const existingCode = await this.repository.findByCode(shelfTemplateId, dto.code);
        if (existingCode) {
            throw new ConflictException(
                this.i18n.t('block-template.errors.code_exists', { lang }),
            );
        }

        // Validate position bounds
        const warehouseLength = Number(shelf.rack_template.row_template.warehouse_template.length);
        const warehouseWidth = Number(shelf.rack_template.row_template.warehouse_template.width);
        if ((dto.position_x !== undefined && dto.position_x > warehouseLength) ||
            (dto.position_y !== undefined && dto.position_y > warehouseWidth)) {
            throw new BadRequestException(
                this.i18n.t('block-template.errors.position_out_of_bounds', {
                    lang,
                    args: { name: dto.name, maxLength: warehouseLength, maxWidth: warehouseWidth },
                }),
            );
        }

        const createData: Prisma.BlockTemplateCreateInput = {
            name: dto.name,
            code: dto.code,
            description: dto.description,
            max_weight_capacity: dto.max_weight_capacity ? new Decimal(dto.max_weight_capacity) : undefined,
            height: dto.height ? new Decimal(dto.height) : undefined,
            position_x: dto.position_x ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y ? new Decimal(dto.position_y) : undefined,
            is_active: dto.is_active ?? true,
            created_by: userId,
            shelf_template: { connect: { id: shelfTemplateId } },
        };

        const block = await this.repository.create(createData);

        // Invalidate caches
        await this.invalidateListCache(shelfTemplateId);
        await this.invalidateParentCaches(
            shelf.rack_template.row_template.warehouse_template_id,
            shelf.rack_template.row_template_id,
            shelf.rack_template_id,
            shelfTemplateId,
        );

        // Log
        this.systemLogService.info('BlockTemplate', 'CREATE', `Tạo ô: ${block.name}`, {
            userId,
            metaData: { blockId: block.id, shelfTemplateId, name: block.name, code: block.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('blockTemplate:created', {
            shelfTemplateId,
            blockId: block.id,
            name: block.name,
            code: block.code,
            createdBy: userId,
            timestamp: new Date().toISOString(),
        });

        return block;
    }

    /**
     * Lấy danh sách BlockTemplate
     */
    async findMany(
        shelfTemplateId: string,
        query: QueryBlockTemplateDto,
        lang: string,
    ): Promise<IPaginatedResponse<any>> {
        // Kiểm tra shelf template tồn tại
        const shelf = await this.repository.shelfTemplateExists(shelfTemplateId);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('block-template.errors.shelf_template_not_found', { lang }),
            );
        }

        // Check cache
        const cacheKey = this.getListCacheKey(shelfTemplateId, query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findMany(shelfTemplateId, query);

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    /**
     * Lấy chi tiết BlockTemplate
     */
    async findById(id: string, lang: string) {
        // Check cache
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const block = await this.repository.findById(id);
        if (!block) {
            throw new NotFoundException(
                this.i18n.t('block-template.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(block), this.cacheTTL);

        return block;
    }

    /**
     * Cập nhật BlockTemplate
     */
    async update(
        id: string,
        dto: UpdateBlockTemplateDto,
        userId: string,
        lang: string,
    ) {
        const block = await this.repository.findById(id);
        if (!block) {
            throw new NotFoundException(
                this.i18n.t('block-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra code trùng nếu đang cập nhật code
        if (dto.code && dto.code !== block.code) {
            const existing = await this.repository.findByCode(block.shelf_template_id, dto.code, id);
            if (existing) {
                throw new ConflictException(
                    this.i18n.t('block-template.errors.code_exists', { lang }),
                );
            }
        }

        // Validate position bounds
        if (dto.position_x !== undefined || dto.position_y !== undefined) {
            const shelf = await this.repository.shelfTemplateExists(block.shelf_template_id);
            if (shelf) {
                const warehouseLength = Number(shelf.rack_template.row_template.warehouse_template.length);
                const warehouseWidth = Number(shelf.rack_template.row_template.warehouse_template.width);
                if ((dto.position_x !== undefined && dto.position_x > warehouseLength) ||
                    (dto.position_y !== undefined && dto.position_y > warehouseWidth)) {
                    throw new BadRequestException(
                        this.i18n.t('block-template.errors.position_out_of_bounds', {
                            lang,
                            args: { name: dto.name || block.name, maxLength: warehouseLength, maxWidth: warehouseWidth },
                        }),
                    );
                }
            }
        }

        const updateData: Prisma.BlockTemplateUpdateInput = {
            name: dto.name,
            code: dto.code,
            description: dto.description,
            max_weight_capacity: dto.max_weight_capacity !== undefined ? new Decimal(dto.max_weight_capacity) : undefined,
            height: dto.height !== undefined ? new Decimal(dto.height) : undefined,
            position_x: dto.position_x !== undefined ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y !== undefined ? new Decimal(dto.position_y) : undefined,
            is_active: dto.is_active,
            updated_by: userId,
        };

        const updated = await this.repository.update(id, updateData);

        // Get parent info
        const shelf = await this.repository.shelfTemplateExists(block.shelf_template_id);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(block.shelf_template_id);
        if (shelf) {
            await this.invalidateParentCaches(
                shelf.rack_template.row_template.warehouse_template_id,
                shelf.rack_template.row_template_id,
                shelf.rack_template_id,
                block.shelf_template_id,
            );
        }

        // Log
        this.systemLogService.info('BlockTemplate', 'UPDATE', `Cập nhật ô: ${updated.name}`, {
            userId,
            metaData: { blockId: id, updatedFields: Object.keys(dto) },
        });

        // Emit socket event
        this.websocketGateway.server.emit('blockTemplate:updated', {
            shelfTemplateId: block.shelf_template_id,
            blockId: id,
            name: updated.name,
            updatedFields: Object.keys(dto),
            updatedBy: userId,
            timestamp: new Date().toISOString(),
        });

        return updated;
    }

    /**
     * Xóa BlockTemplate
     */
    async delete(id: string, userId: string, lang: string) {
        const block = await this.repository.findById(id);
        if (!block) {
            throw new NotFoundException(
                this.i18n.t('block-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Get parent info
        const shelf = await this.repository.shelfTemplateExists(block.shelf_template_id);

        // Invalidate cache
        await this.invalidateCache(id);
        await this.invalidateListCache(block.shelf_template_id);
        if (shelf) {
            await this.invalidateParentCaches(
                shelf.rack_template.row_template.warehouse_template_id,
                shelf.rack_template.row_template_id,
                shelf.rack_template_id,
                block.shelf_template_id,
            );
        }

        // Log
        this.systemLogService.info('BlockTemplate', 'DELETE', `Xóa ô: ${block.name}`, {
            userId,
            metaData: { blockId: id, name: block.name },
        });

        // Emit socket event
        this.websocketGateway.server.emit('blockTemplate:deleted', {
            shelfTemplateId: block.shelf_template_id,
            blockId: id,
            name: block.name,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Xóa nhiều BlockTemplate
     */
    async deleteMany(ids: string[], userId: string, lang: string) {
        const blocks = await this.repository.findByIds(ids);
        if (blocks.length === 0) {
            throw new NotFoundException(
                this.i18n.t('block-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate caches
        const shelfTemplateIds = new Set(blocks.map(b => b.shelf_template_id));
        await Promise.all([
            ...ids.map(id => this.invalidateCache(id)),
            ...Array.from(shelfTemplateIds).map(shelfId => this.invalidateListCache(shelfId)),
        ]);

        // Log
        blocks.forEach(block => {
            this.systemLogService.info('BlockTemplate', 'DELETE', `Xóa ô: ${block.name}`, {
                userId,
                metaData: { blockId: block.id, name: block.name },
            });
        });

        // Emit socket event
        this.websocketGateway.server.emit('blockTemplate:deletedMany', {
            blockIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache(shelfTemplateId: string) {
        const listPrefix = this.configService.get<string>('REDIS_BLOCK_TEMPLATE_LIST_KEY_PREFIX', 'block-template:list');
        await this.redisService.delByPattern(`${listPrefix}:${shelfTemplateId}:*`);
    }

    private async invalidateParentCaches(
        warehouseTemplateId: string,
        rowTemplateId: string,
        rackTemplateId: string,
        shelfTemplateId: string,
    ) {
        const shelfPrefix = this.configService.get<string>('REDIS_SHELF_TEMPLATE_KEY_PREFIX', 'shelf-template');
        const shelfListPrefix = this.configService.get<string>('REDIS_SHELF_TEMPLATE_LIST_KEY_PREFIX', 'shelf-template:list');
        const rackPrefix = this.configService.get<string>('REDIS_RACK_TEMPLATE_KEY_PREFIX', 'rack-template');
        const rackListPrefix = this.configService.get<string>('REDIS_RACK_TEMPLATE_LIST_KEY_PREFIX', 'rack-template:list');
        const rowPrefix = this.configService.get<string>('REDIS_ROW_TEMPLATE_KEY_PREFIX', 'row-template');
        const rowListPrefix = this.configService.get<string>('REDIS_ROW_TEMPLATE_LIST_KEY_PREFIX', 'row-template:list');
        const warehousePrefix = this.configService.get<string>('REDIS_WAREHOUSE_TEMPLATE_KEY_PREFIX', 'warehouse-template');
        const warehouseListPrefix = this.configService.get<string>('REDIS_WAREHOUSE_TEMPLATE_LIST_KEY_PREFIX', 'warehouse-template:list');

        await Promise.all([
            this.redisService.del(`${shelfPrefix}:${shelfTemplateId}`),
            this.redisService.delByPattern(`${shelfListPrefix}:${rackTemplateId}:*`),
            this.redisService.del(`${rackPrefix}:${rackTemplateId}`),
            this.redisService.delByPattern(`${rackListPrefix}:${rowTemplateId}:*`),
            this.redisService.del(`${rowPrefix}:${rowTemplateId}`),
            this.redisService.delByPattern(`${rowListPrefix}:${warehouseTemplateId}:*`),
            this.redisService.del(`${warehousePrefix}:${warehouseTemplateId}`),
            this.redisService.delByPattern(`${warehouseListPrefix}:*`),
        ]);
    }
}
