import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { WarehouseTemplateRepository } from './warehouse-template.repository';
import {
    CreateWarehouseTemplateDto,
    UpdateWarehouseTemplateDto,
    QueryWarehouseTemplateDto,
    UpsertLayoutDto,
    LayoutRowDto,
    LayoutRackDto,
    LayoutShelfDto,
    LayoutBlockDto,
} from './dto';
import {
    IWarehouseTemplateWithRelations,
    IPaginatedResponse,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { ImageUploadService, ImageUploadResult } from '../../common/services/image-upload.service';

// Giới hạn số lượng ảnh tối đa
const MAX_IMAGES_PER_TEMPLATE = 10;

/**
 * Service xử lý business logic cho WarehouseTemplate
 */
@Injectable()
export class WarehouseTemplateService {
    constructor(
        private readonly repository: WarehouseTemplateRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly i18n: I18nService,
        private readonly imageUploadService: ImageUploadService,
    ) { }

    /**
     * Tạo mới WarehouseTemplate
     */
    async create(
        dto: CreateWarehouseTemplateDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        // Chuẩn bị discount configs data nếu có
        const discountConfigsCreate = dto.discount_configs?.length
            ? this.prepareDiscountConfigsCreate(dto.discount_configs, userId)
            : undefined;

        const template = await this.repository.create({
            name: dto.name,
            description: dto.description,
            length: dto.length,
            width: dto.width,
            is_shared_warehouse: dto.is_shared_warehouse ?? false,
            price_per_month: new Decimal(dto.price_per_month),
            whole_warehouse_discount: dto.whole_warehouse_discount ? new Decimal(dto.whole_warehouse_discount) : undefined,
            address_detail: dto.address_detail,
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
            latitude: dto.latitude ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude ? new Decimal(dto.longitude) : undefined,
            block_length: new Decimal(dto.block_length),
            block_width: new Decimal(dto.block_width),
            is_active: dto.is_active ?? true,
            created_by: userId,
            // Nested create discount configs
            discount_configs: discountConfigsCreate,
        });

        // Invalidate list cache
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'create', `Created warehouse template: ${template.name}`, {
            userId,
            metaData: { templateId: template.id, name: template.name },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateCreated(template.id, template.name, userId);

        return template;
    }

    /**
     * Chuẩn bị data để nested create discount configs
     * - De-dupe theo duration_tier_id
     */
    private prepareDiscountConfigsCreate(configs: CreateWarehouseTemplateDto['discount_configs'], userId: string) {
        if (!configs || configs.length === 0) return undefined;

        // De-dupe: giữ config cuối cùng nếu trùng duration_tier_id
        const uniqueMap = new Map<string, typeof configs[0]>();
        for (const config of configs) {
            uniqueMap.set(config.duration_tier_id, config);
        }

        const uniqueConfigs = Array.from(uniqueMap.values());

        return {
            create: uniqueConfigs.map(config => ({
                duration_tier: { connect: { id: config.duration_tier_id } },
                discount_percent: new Decimal(config.discount_percent),
                is_active: config.is_active ?? true,
                created_by: userId,
            })),
        };
    }

    /**
     * Lấy danh sách WarehouseTemplate
     */
    async findMany(
        query: QueryWarehouseTemplateDto,
    ): Promise<IPaginatedResponse<IWarehouseTemplateWithRelations>> {
        // Tạo cache key dựa trên query params
        const queryParams: Record<string, unknown> = {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
            is_active: query.is_active,
            rental_status: query.rental_status,
            province_id: query.province_id,
        };
        const cacheKey = this.redisService.getWarehouseTemplateListCacheKey(queryParams);

        // Kiểm tra cache
        const cached = await this.redisService.getWarehouseTemplateListCache<
            IPaginatedResponse<IWarehouseTemplateWithRelations>
        >(cacheKey);

        if (cached) {
            return cached;
        }

        const result = await this.repository.findMany(query);

        // Cache kết quả
        await this.redisService.setWarehouseTemplateListCache(cacheKey, result);

        return result;
    }

    /**
     * Lấy chi tiết WarehouseTemplate theo ID
     * Nếu không có quyền list.all, chỉ trả về template is_active = true
     */
    async findById(id: string, lang: string, hasListAllPermission: boolean = false): Promise<IWarehouseTemplateWithRelations> {
        // Kiểm tra cache
        const cached = await this.redisService.getWarehouseTemplateCache<IWarehouseTemplateWithRelations>(id);
        if (cached) {
            // Nếu không có quyền list.all và template không active, trả về not found
            if (!hasListAllPermission && !cached.is_active) {
                throw new NotFoundException(
                    this.i18n.t('warehouse-template.errors.not_found', { lang }),
                );
            }
            return cached;
        }

        const template = await this.repository.findById(id);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Nếu không có quyền list.all và template không active, trả về not found
        if (!hasListAllPermission && !template.is_active) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Cache kết quả
        await this.redisService.setWarehouseTemplateCache(id, template);

        return template;
    }

    /**
     * Cập nhật WarehouseTemplate
     */
    async update(
        id: string,
        dto: UpdateWarehouseTemplateDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }


        const updatedFields = Object.keys(dto);

        // Destructure ward_id, discount_configs, and amenity_ids out for separate handling
        const { ward_id, discount_configs, amenity_ids, ...restDto } = dto;

        const template = await this.repository.update(id, {
            ...restDto,
            price_per_month: dto.price_per_month ? new Decimal(dto.price_per_month) : undefined,
            whole_warehouse_discount: dto.whole_warehouse_discount !== undefined ? new Decimal(dto.whole_warehouse_discount) : undefined,
            latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
            block_length: dto.block_length !== undefined ? new Decimal(dto.block_length) : undefined,
            block_width: dto.block_width !== undefined ? new Decimal(dto.block_width) : undefined,
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
            updated_by: userId,
        });

        // Xử lý discount configs upsert nếu có
        if (discount_configs !== undefined) {
            await this.upsertDiscountConfigs(id, discount_configs, existing.discount_configs || [], userId);
        }

        // Invalidate caches
        await this.redisService.invalidateWarehouseTemplateCache(id);
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Fetch lại để có discount_configs mới nhất
        const updatedTemplate = await this.repository.findById(id);

        // Log
        this.systemLogService.info('warehouse-template', 'update', `Updated warehouse template: ${template.name}`, {
            userId,
            metaData: { templateId: id, updatedFields },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateUpdated(id, template.name, updatedFields, userId);

        return updatedTemplate!;
    }

    /**
     * Upsert discount configs cho warehouse template
     * - Configs có id trong request → update
     * - Configs không có id → create (với de-dupe)
     * - Configs hiện có nhưng không trong request → soft delete
     */
    private async upsertDiscountConfigs(
        templateId: string,
        newConfigs: UpdateWarehouseTemplateDto['discount_configs'],
        existingConfigs: Array<{ id: string; duration_tier_id: string }>,
        userId: string,
    ): Promise<void> {
        if (!newConfigs) return;

        const requestConfigIds = new Set<string>();
        const configsToCreate: Array<{ duration_tier_id: string; discount_percent: number; is_active?: boolean }> = [];
        const configsToUpdate: Array<{ id: string; data: { discount_percent?: Decimal; is_active?: boolean; updated_by?: string } }> = [];

        // De-dupe theo duration_tier_id
        const uniqueMap = new Map<string, {
            id?: string;
            duration_tier_id: string;
            discount_percent: number;
            is_active?: boolean;
        }>();

        for (const config of newConfigs) {
            uniqueMap.set(config.duration_tier_id, config);
        }
        const uniqueConfigs = Array.from(uniqueMap.values());

        for (const config of uniqueConfigs) {
            if (config.id) {
                // Update existing config
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
                // Create new config
                configsToCreate.push({
                    duration_tier_id: config.duration_tier_id,
                    discount_percent: config.discount_percent,
                    is_active: config.is_active,
                });
            }
        }

        // Tìm configs cần soft delete (hiện có nhưng không trong request)
        const configIdsToDelete = existingConfigs
            .filter(c => !requestConfigIds.has(c.id))
            .map(c => c.id);

        // Execute upsert operations
        await this.repository.upsertDiscountConfigs(
            templateId,
            configsToCreate.map(c => ({
                ...c,
                discount_percent: new Decimal(c.discount_percent),
                is_active: c.is_active ?? true,
                created_by: userId,
            })),
            configsToUpdate,
            configIdsToDelete,
            userId,
        );
    }

    /**
     * Xóa mềm WarehouseTemplate
     */
    async delete(id: string, userId: string, lang: string): Promise<void> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate caches
        await this.redisService.invalidateWarehouseTemplateCache(id);
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'delete', `Deleted warehouse template: ${existing.name}`, {
            userId,
            metaData: { templateId: id, name: existing.name },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateDeleted(id, existing.name, userId);
    }

    /**
     * Xóa nhiều WarehouseTemplate
     */
    async deleteMany(ids: string[], userId: string, lang: string): Promise<void> {
        const templates = await this.repository.findByIds(ids);
        if (templates.length === 0) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate caches
        await Promise.all(ids.map(id => this.redisService.invalidateWarehouseTemplateCache(id)));
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'delete_many', `Deleted ${templates.length} warehouse templates`, {
            userId,
            metaData: { ids, names: templates.map(t => t.name) },
        });

        // Emit WebSocket events
        this.websocketGateway.server.emit('warehouseTemplate:deletedMany', {
            ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Cập nhật layout (rows, racks, shelves, blocks) - OPTIMIZED với batch operations
     * Giảm từ N queries xuống còn ~8-12 queries bất kể số lượng items
     */
    async upsertLayout(
        templateId: string,
        dto: UpsertLayoutDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        const existing = await this.repository.findById(templateId);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        const summary = {
            rowsCreated: 0,
            rowsUpdated: 0,
            rowsDeleted: 0,
            racksCreated: 0,
            racksUpdated: 0,
            racksDeleted: 0,
            shelvesCreated: 0,
            shelvesUpdated: 0,
            shelvesDeleted: 0,
            blocksCreated: 0,
            blocksUpdated: 0,
            blocksDeleted: 0,
        };

        // Collect all operations first
        const operations = {
            rowsToCreate: [] as Prisma.RowTemplateCreateManyInput[],
            rowsToUpdate: [] as { id: string; data: Prisma.RowTemplateUpdateInput }[],
            rowIdsToDelete: [] as string[],
            racksToCreate: [] as Prisma.RackTemplateCreateManyInput[],
            racksToUpdate: [] as { id: string; data: Prisma.RackTemplateUpdateInput }[],
            rackIdsToDelete: [] as string[],
            shelvesToCreate: [] as Prisma.ShelfTemplateCreateManyInput[],
            shelvesToUpdate: [] as { id: string; data: Prisma.ShelfTemplateUpdateInput }[],
            shelfIdsToDelete: [] as string[],
            blocksToCreate: [] as Prisma.BlockTemplateCreateManyInput[],
            blocksToUpdate: [] as { id: string; data: Prisma.BlockTemplateUpdateInput }[],
            blockIdsToDelete: [] as string[],
        };

        // Lấy existing data để xác định cần delete
        const existingRows = await this.repository.findRowsByTemplateId(templateId);
        const incomingRowIds = dto.rows.filter(r => r.id && !r._delete).map(r => r.id!);

        // Collect row operations
        for (const row of dto.rows) {
            if (row._delete && row.id) {
                operations.rowIdsToDelete.push(row.id);
                summary.rowsDeleted++;
                // Also mark nested items for deletion
                const existingRow = existingRows.find(r => r.id === row.id);
                if (existingRow) {
                    this.collectNestedDeletions(existingRow, operations, summary);
                }
                continue;
            }

            if (row.id) {
                // Update existing row
                operations.rowsToUpdate.push({
                    id: row.id,
                    data: this.buildRowUpdateData(row, userId),
                });
                summary.rowsUpdated++;
                // Process nested racks
                if (row.racks) {
                    this.collectRackOperations(row.id, row.racks, userId, operations, summary);
                }
            } else {
                // Create new row with generated ID
                const newRowId = uuidv4();
                operations.rowsToCreate.push({
                    id: newRowId,
                    warehouse_template_id: templateId,
                    ...this.buildRowCreateDataFlat(row, userId),
                });
                summary.rowsCreated++;
                // Process nested racks with the new row ID
                if (row.racks) {
                    this.collectRackOperations(newRowId, row.racks, userId, operations, summary);
                }
            }
        }

        // Mark orphan rows for deletion
        for (const existingRow of existingRows) {
            if (!incomingRowIds.includes(existingRow.id) && !operations.rowIdsToDelete.includes(existingRow.id)) {
                operations.rowIdsToDelete.push(existingRow.id);
                summary.rowsDeleted++;
                this.collectNestedDeletions(existingRow, operations, summary);
            }
        }

        // Execute all operations in batch
        await this.repository.bulkUpsertLayout(operations, userId);

        // Invalidate caches in parallel
        await Promise.all([
            this.redisService.invalidateWarehouseTemplateCache(templateId),
            this.redisService.invalidateWarehouseTemplateListCache(),
        ]);

        // Log
        this.systemLogService.info('warehouse-template', 'layout_update', `Updated layout for: ${existing.name}`, {
            userId,
            metaData: { templateId, summary },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateLayoutUpdated(templateId, existing.name, userId, summary);

        // Refresh and return
        return this.repository.findById(templateId) as unknown as IWarehouseTemplateWithRelations;
    }

    /**
     * Collect rack operations for batch processing
     */
    private collectRackOperations(
        rowId: string,
        racks: LayoutRackDto[],
        userId: string,
        operations: {
            racksToCreate: Prisma.RackTemplateCreateManyInput[];
            racksToUpdate: { id: string; data: Prisma.RackTemplateUpdateInput }[];
            rackIdsToDelete: string[];
            shelvesToCreate: Prisma.ShelfTemplateCreateManyInput[];
            shelvesToUpdate: { id: string; data: Prisma.ShelfTemplateUpdateInput }[];
            shelfIdsToDelete: string[];
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToDelete: string[];
        },
        summary: Record<string, number>,
    ): void {
        for (const rack of racks) {
            if (rack._delete && rack.id) {
                operations.rackIdsToDelete.push(rack.id);
                summary.racksDeleted++;
                continue;
            }

            if (rack.id) {
                operations.racksToUpdate.push({
                    id: rack.id,
                    data: this.buildRackUpdateData(rack, userId),
                });
                summary.racksUpdated++;
                if (rack.shelves) {
                    this.collectShelfOperations(rack.id, rack.shelves, userId, operations, summary);
                }
            } else {
                const newRackId = uuidv4();
                operations.racksToCreate.push({
                    id: newRackId,
                    row_template_id: rowId,
                    ...this.buildRackCreateDataFlat(rack, userId),
                });
                summary.racksCreated++;
                if (rack.shelves) {
                    this.collectShelfOperations(newRackId, rack.shelves, userId, operations, summary);
                }
            }
        }
    }

    /**
     * Collect shelf operations for batch processing
     */
    private collectShelfOperations(
        rackId: string,
        shelves: LayoutShelfDto[],
        userId: string,
        operations: {
            shelvesToCreate: Prisma.ShelfTemplateCreateManyInput[];
            shelvesToUpdate: { id: string; data: Prisma.ShelfTemplateUpdateInput }[];
            shelfIdsToDelete: string[];
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToDelete: string[];
        },
        summary: Record<string, number>,
    ): void {
        for (const shelf of shelves) {
            if (shelf._delete && shelf.id) {
                operations.shelfIdsToDelete.push(shelf.id);
                summary.shelvesDeleted++;
                continue;
            }

            if (shelf.id) {
                operations.shelvesToUpdate.push({
                    id: shelf.id,
                    data: this.buildShelfUpdateData(shelf, userId),
                });
                summary.shelvesUpdated++;
                if (shelf.blocks) {
                    this.collectBlockOperations(shelf.id, shelf.blocks, userId, operations, summary);
                }
            } else {
                const newShelfId = uuidv4();
                operations.shelvesToCreate.push({
                    id: newShelfId,
                    rack_template_id: rackId,
                    ...this.buildShelfCreateDataFlat(shelf, userId),
                });
                summary.shelvesCreated++;
                if (shelf.blocks) {
                    this.collectBlockOperations(newShelfId, shelf.blocks, userId, operations, summary);
                }
            }
        }
    }

    /**
     * Collect block operations for batch processing
     */
    private collectBlockOperations(
        shelfId: string,
        blocks: LayoutBlockDto[],
        userId: string,
        operations: {
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToDelete: string[];
        },
        summary: Record<string, number>,
    ): void {
        for (const block of blocks) {
            if (block._delete && block.id) {
                operations.blockIdsToDelete.push(block.id);
                summary.blocksDeleted++;
                continue;
            }

            if (block.id) {
                operations.blocksToUpdate.push({
                    id: block.id,
                    data: this.buildBlockUpdateData(block, userId),
                });
                summary.blocksUpdated++;
            } else {
                operations.blocksToCreate.push({
                    id: uuidv4(),
                    shelf_template_id: shelfId,
                    ...this.buildBlockCreateDataFlat(block, userId),
                });
                summary.blocksCreated++;
            }
        }
    }

    /**
     * Collect nested deletions when a parent is deleted
     */
    private collectNestedDeletions(
        existingRow: Awaited<ReturnType<typeof this.repository.findRowsByTemplateId>>[0],
        operations: {
            rackIdsToDelete: string[];
            shelfIdsToDelete: string[];
            blockIdsToDelete: string[];
        },
        summary: Record<string, number>,
    ): void {
        for (const rack of existingRow.racks || []) {
            operations.rackIdsToDelete.push(rack.id);
            summary.racksDeleted++;
            for (const shelf of rack.shelves || []) {
                operations.shelfIdsToDelete.push(shelf.id);
                summary.shelvesDeleted++;
                for (const block of shelf.blocks || []) {
                    operations.blockIdsToDelete.push(block.id);
                    summary.blocksDeleted++;
                }
            }
        }
    }

    /**
     * Xử lý racks trong layout (legacy - kept for backward compatibility)
     */
    private async processRacks(
        rowId: string,
        racks: LayoutRackDto[],
        userId: string,
        summary: Record<string, number>,
    ): Promise<void> {
        for (const rack of racks) {
            if (rack._delete && rack.id) {
                await this.repository.softDeleteRack(rack.id, userId);
                summary.racksDeleted++;
                continue;
            }

            let rackId: string;

            if (rack.id) {
                await this.repository.updateRack(rack.id, this.buildRackUpdateData(rack, userId));
                rackId = rack.id;
                summary.racksUpdated++;
            } else {
                const newRack = await this.repository.createRack({
                    row_template: { connect: { id: rowId } },
                    ...this.buildRackCreateData(rack, userId),
                });
                rackId = newRack.id;
                summary.racksCreated++;
            }

            if (rack.shelves) {
                await this.processShelves(rackId, rack.shelves, userId, summary);
            }
        }
    }

    /**
     * Xử lý shelves trong layout
     */
    private async processShelves(
        rackId: string,
        shelves: LayoutShelfDto[],
        userId: string,
        summary: Record<string, number>,
    ): Promise<void> {
        for (const shelf of shelves) {
            if (shelf._delete && shelf.id) {
                await this.repository.softDeleteShelf(shelf.id, userId);
                summary.shelvesDeleted++;
                continue;
            }

            let shelfId: string;

            if (shelf.id) {
                await this.repository.updateShelf(shelf.id, this.buildShelfUpdateData(shelf, userId));
                shelfId = shelf.id;
                summary.shelvesUpdated++;
            } else {
                const newShelf = await this.repository.createShelf({
                    rack_template: { connect: { id: rackId } },
                    ...this.buildShelfCreateData(shelf, userId),
                });
                shelfId = newShelf.id;
                summary.shelvesCreated++;
            }

            if (shelf.blocks) {
                await this.processBlocks(shelfId, shelf.blocks, userId, summary);
            }
        }
    }

    /**
     * Xử lý blocks trong layout
     */
    private async processBlocks(
        shelfId: string,
        blocks: LayoutBlockDto[],
        userId: string,
        summary: Record<string, number>,
    ): Promise<void> {
        for (const block of blocks) {
            if (block._delete && block.id) {
                await this.repository.softDeleteBlock(block.id, userId);
                summary.blocksDeleted++;
                continue;
            }

            if (block.id) {
                await this.repository.updateBlock(block.id, this.buildBlockUpdateData(block, userId));
                summary.blocksUpdated++;
            } else {
                await this.repository.createBlock({
                    shelf_template: { connect: { id: shelfId } },
                    ...this.buildBlockCreateData(block, userId),
                });
                summary.blocksCreated++;
            }
        }
    }

    private buildRowCreateData(row: LayoutRowDto, userId: string) {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            is_rented: row.is_rented ?? false,
            price_per_month: new Decimal(row.price_per_month ?? 0),
            discount_1_month: row.discount_1_month ? new Decimal(row.discount_1_month) : new Decimal(0),
            discount_3_months: row.discount_3_months ? new Decimal(row.discount_3_months) : new Decimal(5),
            discount_6_months: row.discount_6_months ? new Decimal(row.discount_6_months) : new Decimal(10),
            discount_1_year: row.discount_1_year ? new Decimal(row.discount_1_year) : new Decimal(15),
            discount_2_years: row.discount_2_years ? new Decimal(row.discount_2_years) : new Decimal(20),
            discount_3_years_plus: row.discount_3_years_plus ? new Decimal(row.discount_3_years_plus) : new Decimal(25),
            address: row.address,
            latitude: row.latitude ? new Decimal(row.latitude) : undefined,
            longitude: row.longitude ? new Decimal(row.longitude) : undefined,
            position_x: row.position_x ? new Decimal(row.position_x) : undefined,
            position_y: row.position_y ? new Decimal(row.position_y) : undefined,
            position_rotation: row.position_rotation ? new Decimal(row.position_rotation) : undefined,
            is_active: row.is_active ?? true,
            created_by: userId,
        };
    }

    private buildRowUpdateData(row: LayoutRowDto, userId: string) {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            is_rented: row.is_rented,
            price_per_month: row.price_per_month !== undefined ? new Decimal(row.price_per_month) : undefined,
            discount_1_month: row.discount_1_month !== undefined ? new Decimal(row.discount_1_month) : undefined,
            discount_3_months: row.discount_3_months !== undefined ? new Decimal(row.discount_3_months) : undefined,
            discount_6_months: row.discount_6_months !== undefined ? new Decimal(row.discount_6_months) : undefined,
            discount_1_year: row.discount_1_year !== undefined ? new Decimal(row.discount_1_year) : undefined,
            discount_2_years: row.discount_2_years !== undefined ? new Decimal(row.discount_2_years) : undefined,
            discount_3_years_plus: row.discount_3_years_plus !== undefined ? new Decimal(row.discount_3_years_plus) : undefined,
            address: row.address,
            latitude: row.latitude !== undefined ? new Decimal(row.latitude) : undefined,
            longitude: row.longitude !== undefined ? new Decimal(row.longitude) : undefined,
            position_x: row.position_x !== undefined ? new Decimal(row.position_x) : undefined,
            position_y: row.position_y !== undefined ? new Decimal(row.position_y) : undefined,
            position_rotation: row.position_rotation !== undefined ? new Decimal(row.position_rotation) : undefined,
            is_active: row.is_active,
            updated_by: userId,
        };
    }

    private buildRackCreateData(rack: LayoutRackDto, userId: string) {
        return {
            name: rack.name,
            code: rack.code,
            description: rack.description,
            position_x: rack.position_x ? new Decimal(rack.position_x) : undefined,
            position_y: rack.position_y ? new Decimal(rack.position_y) : undefined,
            position_rotation: rack.position_rotation ? new Decimal(rack.position_rotation) : undefined,
            dimensions_width: rack.dimensions_width ? new Decimal(rack.dimensions_width) : undefined,
            dimensions_depth: rack.dimensions_depth ? new Decimal(rack.dimensions_depth) : undefined,
            dimensions_height: rack.dimensions_height ? new Decimal(rack.dimensions_height) : undefined,
            is_active: rack.is_active ?? true,
            created_by: userId,
        };
    }

    private buildRackUpdateData(rack: LayoutRackDto, userId: string) {
        return {
            name: rack.name,
            code: rack.code,
            description: rack.description,
            position_x: rack.position_x !== undefined ? new Decimal(rack.position_x) : undefined,
            position_y: rack.position_y !== undefined ? new Decimal(rack.position_y) : undefined,
            position_rotation: rack.position_rotation !== undefined ? new Decimal(rack.position_rotation) : undefined,
            dimensions_width: rack.dimensions_width !== undefined ? new Decimal(rack.dimensions_width) : undefined,
            dimensions_depth: rack.dimensions_depth !== undefined ? new Decimal(rack.dimensions_depth) : undefined,
            dimensions_height: rack.dimensions_height !== undefined ? new Decimal(rack.dimensions_height) : undefined,
            is_active: rack.is_active,
            updated_by: userId,
        };
    }

    private buildShelfCreateData(shelf: LayoutShelfDto, userId: string) {
        return {
            name: shelf.name,
            code: shelf.code,
            description: shelf.description,
            is_active: shelf.is_active ?? true,
            created_by: userId,
        };
    }

    private buildShelfUpdateData(shelf: LayoutShelfDto, userId: string) {
        return {
            name: shelf.name,
            code: shelf.code,
            description: shelf.description,
            is_active: shelf.is_active,
            updated_by: userId,
        };
    }

    private buildBlockCreateData(block: LayoutBlockDto, userId: string) {
        return {
            name: block.name,
            code: block.code,
            description: block.description,
            position_x: block.position_x ? new Decimal(block.position_x) : undefined,
            position_y: block.position_y ? new Decimal(block.position_y) : undefined,
            dimensions_width: block.dimensions_width ? new Decimal(block.dimensions_width) : undefined,
            dimensions_height: block.dimensions_height ? new Decimal(block.dimensions_height) : undefined,
            is_active: block.is_active ?? true,
            created_by: userId,
        };
    }

    private buildBlockUpdateData(block: LayoutBlockDto, userId: string) {
        return {
            name: block.name,
            code: block.code,
            description: block.description,
            position_x: block.position_x !== undefined ? new Decimal(block.position_x) : undefined,
            position_y: block.position_y !== undefined ? new Decimal(block.position_y) : undefined,
            dimensions_width: block.dimensions_width !== undefined ? new Decimal(block.dimensions_width) : undefined,
            dimensions_height: block.dimensions_height !== undefined ? new Decimal(block.dimensions_height) : undefined,
            is_active: block.is_active,
            updated_by: userId,
        };
    }

    private buildRowCreateDataFlat(row: LayoutRowDto, userId: string): Omit<Prisma.RowTemplateCreateManyInput, 'id' | 'warehouse_template_id'> {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            is_rented: row.is_rented ?? false,
            price_per_month: row.price_per_month ?? 0,
            address: row.address,
            latitude: row.latitude,
            longitude: row.longitude,
            position_x: row.position_x,
            position_y: row.position_y,
            position_rotation: row.position_rotation,
            is_active: row.is_active ?? true,
            created_by: userId,
        };
    }


    private buildRackCreateDataFlat(rack: LayoutRackDto, userId: string): Omit<Prisma.RackTemplateCreateManyInput, 'id' | 'row_template_id'> {
        return {
            name: rack.name,
            code: rack.code,
            description: rack.description,
            position_x: rack.position_x,
            position_y: rack.position_y,
            position_rotation: rack.position_rotation,
            dimensions_width: rack.dimensions_width,
            dimensions_depth: rack.dimensions_depth,
            dimensions_height: rack.dimensions_height,
            is_active: rack.is_active ?? true,
            created_by: userId,
        };
    }

    private buildShelfCreateDataFlat(shelf: LayoutShelfDto, userId: string): Omit<Prisma.ShelfTemplateCreateManyInput, 'id' | 'rack_template_id'> {
        return {
            name: shelf.name,
            code: shelf.code,
            description: shelf.description,
            is_active: shelf.is_active ?? true,
            created_by: userId,
        };
    }

    private buildBlockCreateDataFlat(block: LayoutBlockDto, userId: string): Omit<Prisma.BlockTemplateCreateManyInput, 'id' | 'shelf_template_id'> {
        return {
            name: block.name,
            code: block.code,
            description: block.description,
            position_x: block.position_x,
            position_y: block.position_y,
            dimensions_width: block.dimensions_width,
            dimensions_height: block.dimensions_height,
            is_active: block.is_active ?? true,
            created_by: userId,
        };
    }

    /**
     * Upload ảnh cho WarehouseTemplate
     * @param templateId ID của template
     * @param files Danh sách files upload
     * @param userId ID user thực hiện
     * @param lang Ngôn ngữ
     */
    async uploadImages(
        templateId: string,
        files: Express.Multer.File[],
        userId: string,
        lang: string,
    ): Promise<ImageUploadResult[]> {
        // Kiểm tra template tồn tại
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra số lượng ảnh
        const currentCount = await this.repository.countImagesByTemplateId(templateId);
        if (currentCount + files.length > MAX_IMAGES_PER_TEMPLATE) {
            throw new BadRequestException(
                this.i18n.t('warehouse-template.errors.max_images_exceeded', {
                    lang,
                    args: { max: MAX_IMAGES_PER_TEMPLATE },
                }),
            );
        }

        // Upload lên ImageKit
        const uploadResults = await this.imageUploadService.processAndUploadMultiple(
            files.map((f) => ({ buffer: f.buffer, originalname: f.originalname })),
            `/warehouse-templates/${templateId}`,
        );

        // Lấy order hiện tại
        let currentOrder = await this.repository.getMaxImageOrder(templateId);

        // Lưu vào database
        const imageRecords = uploadResults.map((result) => ({
            warehouse_template_id: templateId,
            url: result.url,
            thumbnail_url: result.thumbnailUrl,
            file_id: result.fileId,
            original_name: result.name,
            size: result.size,
            order: ++currentOrder,
            created_by: userId,
        }));

        await this.repository.createManyImages(imageRecords);

        // Invalidate cache
        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Log
        this.systemLogService.info('warehouse-template', 'upload_images', `Uploaded ${files.length} images for: ${template.name}`, {
            userId,
            metaData: { templateId, count: files.length },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImagesUploaded(templateId, files.length, userId);

        return uploadResults;
    }

    /**
     * Xóa ảnh của WarehouseTemplate
     * @param templateId ID template
     * @param imageId ID ảnh
     * @param userId ID user
     * @param lang Ngôn ngữ
     */
    async deleteImage(
        templateId: string,
        imageId: string,
        userId: string,
        lang: string,
    ): Promise<void> {
        // Kiểm tra template tồn tại
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Kiểm tra image tồn tại
        const image = await this.repository.findImageById(imageId);
        if (!image || image.warehouse_template_id !== templateId) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.image_not_found', { lang }),
            );
        }

        // Xóa trên ImageKit
        try {
            await this.imageUploadService.deleteImage(image.file_id);
        } catch (error) {
            // Log lỗi nhưng không throw - vẫn xóa trong DB
            this.systemLogService.error('warehouse-template', 'delete_image_imagekit', `Failed to delete from ImageKit: ${error}`, {
                userId,
                metaData: { templateId, imageId, fileId: image.file_id },
            });
        }

        // Soft delete trong DB
        await this.repository.softDeleteImage(imageId, userId);

        // Invalidate cache
        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Log
        this.systemLogService.info('warehouse-template', 'delete_image', `Deleted image from: ${template.name}`, {
            userId,
            metaData: { templateId, imageId },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImageDeleted(templateId, imageId, userId);
    }

    async deleteManyImages(
        templateId: string,
        ids: string[],
        userId: string,
        lang: string,
    ): Promise<void> {
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        const images = await this.repository.findImagesByIds(ids);
        if (images.length === 0) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.image_not_found', { lang }),
            );
        }

        // Validate images belong to template
        const invalidImage = images.find(img => img.warehouse_template_id !== templateId);
        if (invalidImage) {
            throw new BadRequestException(
                this.i18n.t('warehouse-template.errors.image_not_found', { lang }),
            );
        }

        // Delete from ImageKit
        await Promise.all(
            images.map(image =>
                this.imageUploadService.deleteImage(image.file_id).catch(error => {
                    this.systemLogService.error('warehouse-template', 'delete_image_imagekit', `Failed to delete from ImageKit: ${error}`, {
                        userId,
                        metaData: { templateId, imageId: image.id, fileId: image.file_id },
                    });
                })
            )
        );

        await this.repository.softDeleteManyImages(ids, userId);

        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImagesDeletedMany(templateId, ids, userId);

        this.systemLogService.info('warehouse-template', 'delete_images_many', `Deleted ${ids.length} images from: ${template.name}`, {
            userId,
            metaData: { templateId, count: ids.length },
        });
    }

    /**
     * Sắp xếp lại thứ tự ảnh
     * @param templateId ID template
     * @param imageOrders Danh sách { id, order }
     * @param userId ID user
     * @param lang Ngôn ngữ
     */
    async reorderImages(
        templateId: string,
        imageOrders: { id: string; order: number }[],
        userId: string,
        lang: string,
    ): Promise<void> {
        // Kiểm tra template tồn tại
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        // Batch update order
        await this.repository.batchUpdateImageOrder(imageOrders);

        // Invalidate cache
        await this.redisService.invalidateWarehouseTemplateCache(templateId);

        // Log
        this.systemLogService.info('warehouse-template', 'reorder_images', `Reordered images for: ${template.name}`, {
            userId,
            metaData: { templateId, count: imageOrders.length },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateImagesReordered(templateId, userId);
    }

    /**
     * Lấy danh sách ảnh của template
     */
    async getImages(templateId: string, lang: string) {
        const template = await this.repository.findById(templateId);
        if (!template) {
            throw new NotFoundException(
                this.i18n.t('warehouse-template.errors.not_found', { lang }),
            );
        }

        return this.repository.findImagesByTemplateId(templateId);
    }
}
