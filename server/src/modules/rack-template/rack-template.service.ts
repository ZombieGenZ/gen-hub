import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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

        // Validate position bounds
        const warehouseLength = Number(row.warehouse_template.length);
        const warehouseWidth = Number(row.warehouse_template.width);
        if ((dto.position_x !== undefined && dto.position_x > warehouseLength) ||
            (dto.position_y !== undefined && dto.position_y > warehouseWidth)) {
            throw new BadRequestException(
                this.i18n.t('rack-template.errors.position_out_of_bounds', {
                    lang,
                    args: { name: dto.name, maxLength: warehouseLength, maxWidth: warehouseWidth },
                }),
            );
        }

        // Validate rack overlap
        await this.checkRackOverlap(
            rowTemplateId,
            dto.name,
            dto.position_x,
            dto.position_y,
            dto.dimensions_width,
            dto.dimensions_height,
            undefined,
            lang,
        );

        const createData: Prisma.RackTemplateCreateInput = {
            ...dto,
            default_block_max_weight_capacity: dto.default_block_max_weight_capacity ? new Decimal(dto.default_block_max_weight_capacity) : undefined,
            overload_threshold_percent: dto.overload_threshold_percent ? new Decimal(dto.overload_threshold_percent) : undefined,
            position_x: dto.position_x ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y ? new Decimal(dto.position_y) : undefined,
            position_rotation: dto.position_rotation ? new Decimal(dto.position_rotation) : undefined,
            dimensions_width: dto.dimensions_width ? new Decimal(dto.dimensions_width) : undefined,
            dimensions_height: dto.dimensions_height ? new Decimal(dto.dimensions_height) : undefined,
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

        // Validate position bounds
        if (dto.position_x !== undefined || dto.position_y !== undefined) {
            const row = await this.repository.rowTemplateExists(rack.row_template_id);
            if (row) {
                const warehouseLength = Number(row.warehouse_template.length);
                const warehouseWidth = Number(row.warehouse_template.width);
                if ((dto.position_x !== undefined && dto.position_x > warehouseLength) ||
                    (dto.position_y !== undefined && dto.position_y > warehouseWidth)) {
                    throw new BadRequestException(
                        this.i18n.t('rack-template.errors.position_out_of_bounds', {
                            lang,
                            args: { name: dto.name || rack.name, maxLength: warehouseLength, maxWidth: warehouseWidth },
                        }),
                    );
                }
            }
        }

        // Validate rack overlap (chỉ khi có thay đổi position hoặc dimensions)
        if (dto.position_x !== undefined || dto.position_y !== undefined ||
            dto.dimensions_width !== undefined || dto.dimensions_height !== undefined) {
            // Lấy giá trị hiện tại nếu không có trong dto
            const posX = dto.position_x ?? (rack.position_x ? Number(rack.position_x) : undefined);
            const posY = dto.position_y ?? (rack.position_y ? Number(rack.position_y) : undefined);
            const width = dto.dimensions_width ?? (rack.dimensions_width ? Number(rack.dimensions_width) : undefined);
            const height = dto.dimensions_height ?? (rack.dimensions_height ? Number(rack.dimensions_height) : undefined);

            await this.checkRackOverlap(
                rack.row_template_id,
                dto.name || rack.name,
                posX,
                posY,
                width,
                height,
                id, // exclude current rack
                lang,
            );
        }

        const updateData: Prisma.RackTemplateUpdateInput = {
            ...dto,
            default_block_max_weight_capacity: dto.default_block_max_weight_capacity !== undefined ? new Decimal(dto.default_block_max_weight_capacity) : undefined,
            overload_threshold_percent: dto.overload_threshold_percent !== undefined ? new Decimal(dto.overload_threshold_percent) : undefined,
            position_x: dto.position_x !== undefined ? new Decimal(dto.position_x) : undefined,
            position_y: dto.position_y !== undefined ? new Decimal(dto.position_y) : undefined,
            position_rotation: dto.position_rotation !== undefined ? new Decimal(dto.position_rotation) : undefined,
            dimensions_width: dto.dimensions_width !== undefined ? new Decimal(dto.dimensions_width) : undefined,
            dimensions_height: dto.dimensions_height !== undefined ? new Decimal(dto.dimensions_height) : undefined,
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

    /**
     * Kiểm tra 2 hình chữ nhật có đè lên nhau không
     */
    private isRectOverlapping(
        rect1: { x: number; y: number; width: number; height: number },
        rect2: { x: number; y: number; width: number; height: number },
    ): boolean {
        const noOverlap =
            rect1.x + rect1.width <= rect2.x ||
            rect1.x >= rect2.x + rect2.width ||
            rect1.y + rect1.height <= rect2.y ||
            rect1.y >= rect2.y + rect2.height;
        return !noOverlap;
    }

    /**
     * Kiểm tra rack mới có overlap với các racks đã tồn tại trong cùng row không
     */
    private async checkRackOverlap(
        rowTemplateId: string,
        rackName: string,
        posX: number | undefined,
        posY: number | undefined,
        width: number | undefined,
        height: number | undefined,
        excludeRackId: string | undefined,
        lang: string,
    ): Promise<void> {
        // Nếu không có đủ position và dimensions thì skip
        if (posX === undefined || posY === undefined ||
            width === undefined || height === undefined) {
            return;
        }

        const existingRacks = await this.repository.findRacksInRow(rowTemplateId, excludeRackId);

        const newRect = { x: posX, y: posY, width, height };

        for (const rack of existingRacks) {
            // Skip rack nếu không có đủ thông tin position và dimensions
            if (rack.position_x === null || rack.position_y === null ||
                rack.dimensions_width === null || rack.dimensions_height === null) {
                continue;
            }

            const existingRect = {
                x: Number(rack.position_x),
                y: Number(rack.position_y),
                width: Number(rack.dimensions_width),
                height: Number(rack.dimensions_height),
            };

            if (this.isRectOverlapping(newRect, existingRect)) {
                throw new BadRequestException(
                    this.i18n.t('rack-template.errors.racks_overlap', {
                        lang,
                        args: { name: rackName, otherRack: rack.name },
                    }),
                );
            }
        }
    }
}
