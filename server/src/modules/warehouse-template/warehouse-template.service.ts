import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
    ) { }

    /**
     * Tạo mới WarehouseTemplate
     */
    async create(
        dto: CreateWarehouseTemplateDto,
        userId: string,
        lang: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        // Kiểm tra tên trùng
        const nameExists = await this.repository.findByName(dto.name);
        if (nameExists) {
            throw new ConflictException(
                this.i18n.t('warehouse-template.errors.name_exists', { lang }),
            );
        }

        const template = await this.repository.create({
            name: dto.name,
            description: dto.description,
            unit: dto.unit,
            length: dto.length,
            width: dto.width,
            price_per_day: new Decimal(dto.price_per_day),
            discount_1_week: dto.discount_1_week ? new Decimal(dto.discount_1_week) : undefined,
            discount_1_month: dto.discount_1_month ? new Decimal(dto.discount_1_month) : undefined,
            discount_3_months: dto.discount_3_months ? new Decimal(dto.discount_3_months) : undefined,
            discount_6_months: dto.discount_6_months ? new Decimal(dto.discount_6_months) : undefined,
            discount_1_year: dto.discount_1_year ? new Decimal(dto.discount_1_year) : undefined,
            discount_2_years: dto.discount_2_years ? new Decimal(dto.discount_2_years) : undefined,
            discount_3_years_plus: dto.discount_3_years_plus ? new Decimal(dto.discount_3_years_plus) : undefined,
            whole_warehouse_discount: dto.whole_warehouse_discount ? new Decimal(dto.whole_warehouse_discount) : undefined,
            address_detail: dto.address_detail,
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
            latitude: dto.latitude ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude ? new Decimal(dto.longitude) : undefined,
            block_unit: dto.block_unit,
            block_length: new Decimal(dto.block_length),
            block_width: new Decimal(dto.block_width),
            is_active: dto.is_active ?? true,
            created_by: userId,
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
     */
    async findById(id: string, lang: string): Promise<IWarehouseTemplateWithRelations> {
        // Kiểm tra cache
        const cached = await this.redisService.getWarehouseTemplateCache<IWarehouseTemplateWithRelations>(id);
        if (cached) {
            return cached;
        }

        const template = await this.repository.findById(id);
        if (!template) {
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

        // Kiểm tra tên trùng (trừ chính nó)
        if (dto.name && dto.name !== existing.name) {
            const nameExists = await this.repository.findByName(dto.name, id);
            if (nameExists) {
                throw new ConflictException(
                    this.i18n.t('warehouse-template.errors.name_exists', { lang }),
                );
            }
        }

        const updatedFields = Object.keys(dto);

        // Destructure ward_id out since Prisma doesn't accept scalar FK in update - use ward relation instead
        const { ward_id, ...restDto } = dto;

        const template = await this.repository.update(id, {
            ...restDto,
            price_per_day: dto.price_per_day ? new Decimal(dto.price_per_day) : undefined,
            discount_1_week: dto.discount_1_week !== undefined ? new Decimal(dto.discount_1_week) : undefined,
            discount_1_month: dto.discount_1_month !== undefined ? new Decimal(dto.discount_1_month) : undefined,
            discount_3_months: dto.discount_3_months !== undefined ? new Decimal(dto.discount_3_months) : undefined,
            discount_6_months: dto.discount_6_months !== undefined ? new Decimal(dto.discount_6_months) : undefined,
            discount_1_year: dto.discount_1_year !== undefined ? new Decimal(dto.discount_1_year) : undefined,
            discount_2_years: dto.discount_2_years !== undefined ? new Decimal(dto.discount_2_years) : undefined,
            discount_3_years_plus: dto.discount_3_years_plus !== undefined ? new Decimal(dto.discount_3_years_plus) : undefined,
            whole_warehouse_discount: dto.whole_warehouse_discount !== undefined ? new Decimal(dto.whole_warehouse_discount) : undefined,
            latitude: dto.latitude !== undefined ? new Decimal(dto.latitude) : undefined,
            longitude: dto.longitude !== undefined ? new Decimal(dto.longitude) : undefined,
            block_length: dto.block_length !== undefined ? new Decimal(dto.block_length) : undefined,
            block_width: dto.block_width !== undefined ? new Decimal(dto.block_width) : undefined,
            ward: dto.ward_id ? { connect: { id: dto.ward_id } } : undefined,
            updated_by: userId,
        });

        // Invalidate caches
        await this.redisService.invalidateWarehouseTemplateCache(id);
        await this.redisService.invalidateWarehouseTemplateListCache();

        // Log
        this.systemLogService.info('warehouse-template', 'update', `Updated warehouse template: ${template.name}`, {
            userId,
            metaData: { templateId: id, updatedFields },
        });

        // Emit WebSocket event
        this.websocketGateway.emitWarehouseTemplateUpdated(id, template.name, updatedFields, userId);

        return template;
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

    // =========================================
    // BUILD DATA HELPERS
    // =========================================

    private buildRowCreateData(row: LayoutRowDto, userId: string) {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            is_rented: row.is_rented ?? false,
            price_per_day: new Decimal(row.price_per_day ?? 0),
            discount_1_week: row.discount_1_week ? new Decimal(row.discount_1_week) : new Decimal(0),
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
            price_per_day: row.price_per_day !== undefined ? new Decimal(row.price_per_day) : undefined,
            discount_1_week: row.discount_1_week !== undefined ? new Decimal(row.discount_1_week) : undefined,
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

    // =========================================
    // FLAT BUILD DATA HELPERS (for createMany)
    // =========================================

    private buildRowCreateDataFlat(row: LayoutRowDto, userId: string): Omit<Prisma.RowTemplateCreateManyInput, 'id' | 'warehouse_template_id'> {
        return {
            name: row.name,
            code: row.code,
            description: row.description,
            is_rented: row.is_rented ?? false,
            price_per_day: row.price_per_day ?? 0,
            discount_1_week: row.discount_1_week ?? 0,
            discount_1_month: row.discount_1_month ?? 0,
            discount_3_months: row.discount_3_months ?? 5,
            discount_6_months: row.discount_6_months ?? 10,
            discount_1_year: row.discount_1_year ?? 15,
            discount_2_years: row.discount_2_years ?? 20,
            discount_3_years_plus: row.discount_3_years_plus ?? 25,
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
}
