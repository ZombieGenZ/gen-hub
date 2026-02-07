import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { RedisService } from '../redis/redis.service';
import { WarehouseManagerViewRepository } from './warehouse-manager-view.repository';
import { QueryWarehouseManagerViewDto } from './dto/query-warehouse-manager-view.dto';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';
import { Warehouse, Row, Rack, Shelf, Block } from '@prisma/client';
import { GetResponse } from '../../common/responses';

/**
 * Service xử lý logic cho Warehouse Manager View APIs
 */
@Injectable()
export class WarehouseManagerViewService {
    constructor(
        private readonly repository: WarehouseManagerViewRepository,
        private readonly i18n: I18nService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
    ) { }

    /**
     * Lấy danh sách warehouse theo template
     */
    async findWarehousesByTemplate(
        templateId: string,
        query: QueryWarehouseManagerViewDto,
        userId: string,
        lang: string,
    ): Promise<GetResponse<IPaginatedResponse<Warehouse>>> {
        // Check cache
        const cacheKey = `wm:view:warehouses:${templateId}:${JSON.stringify(query)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return new GetResponse(
                'warehouse_manager.warehouse_view_list_success',
                JSON.parse(cached),
                await this.i18n.translate('warehouse_manager.warehouse_view_list_success', { lang }),
            );
        }

        const result = await this.repository.findWarehousesByTemplateId(templateId, query);

        // Cache result
        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_VIEW_CACHE_TTL', 300);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return new GetResponse(
            'warehouse_manager.warehouse_view_list_success',
            result,
            await this.i18n.translate('warehouse_manager.warehouse_view_list_success', { lang }),
        );
    }

    /**
     * Lấy chi tiết warehouse
     */
    async findWarehouseDetail(
        templateId: string,
        warehouseId: string,
        userId: string,
        lang: string,
    ): Promise<GetResponse<Warehouse>> {
        // Check cache
        const cacheKey = `wm:view:warehouse:${warehouseId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            const warehouse = JSON.parse(cached);
            // Verify warehouse belongs to template
            if (warehouse.warehouse_template_id !== templateId) {
                throw new NotFoundException(
                    await this.i18n.translate('warehouse_manager.errors.warehouse_not_found', { lang })
                );
            }
            return new GetResponse(
                'warehouse_manager.warehouse_view_detail_success',
                warehouse,
                await this.i18n.translate('warehouse_manager.warehouse_view_detail_success', { lang }),
            );
        }

        const warehouse = await this.repository.findWarehouseById(warehouseId);
        if (!warehouse) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.warehouse_not_found', { lang })
            );
        }

        // Verify warehouse belongs to template
        if (warehouse.warehouse_template_id !== templateId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.warehouse_not_found', { lang })
            );
        }

        // Cache result
        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_VIEW_CACHE_TTL', 300);
        await this.redisService.set(cacheKey, JSON.stringify(warehouse), ttl);

        return new GetResponse(
            'warehouse_manager.warehouse_view_detail_success',
            warehouse,
            await this.i18n.translate('warehouse_manager.warehouse_view_detail_success', { lang }),
        );
    }

    /**
     * Lấy danh sách rows trong warehouse
     */
    async findRowsByWarehouse(
        templateId: string,
        warehouseId: string,
        query: QueryWarehouseManagerViewDto,
        userId: string,
        lang: string,
    ): Promise<GetResponse<IPaginatedResponse<Row>>> {
        // Verify warehouse belongs to template
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);

        const cacheKey = `wm:view:rows:${warehouseId}:${JSON.stringify(query)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return new GetResponse(
                'warehouse_manager.row_view_list_success',
                JSON.parse(cached),
                await this.i18n.translate('warehouse_manager.row_view_list_success', { lang }),
            );
        }

        const result = await this.repository.findRowsByWarehouseId(warehouseId, query);

        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_VIEW_CACHE_TTL', 300);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return new GetResponse(
            'warehouse_manager.row_view_list_success',
            result,
            await this.i18n.translate('warehouse_manager.row_view_list_success', { lang }),
        );
    }

    /**
     * Lấy chi tiết row
     */
    async findRowDetail(
        templateId: string,
        warehouseId: string,
        rowId: string,
        userId: string,
        lang: string,
    ): Promise<GetResponse<Row>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);

        const row = await this.repository.findRowById(rowId);
        if (!row || row.warehouse_id !== warehouseId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.row_not_found', { lang })
            );
        }

        return new GetResponse(
            'warehouse_manager.row_view_detail_success',
            row,
            await this.i18n.translate('warehouse_manager.row_view_detail_success', { lang }),
        );
    }

    /**
     * Lấy danh sách racks trong row
     */
    async findRacksByRow(
        templateId: string,
        warehouseId: string,
        rowId: string,
        query: QueryWarehouseManagerViewDto,
        userId: string,
        lang: string,
    ): Promise<GetResponse<IPaginatedResponse<Rack>>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);
        await this.verifyRowBelongsToWarehouse(rowId, warehouseId, lang);

        const cacheKey = `wm:view:racks:${rowId}:${JSON.stringify(query)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return new GetResponse(
                'warehouse_manager.rack_view_list_success',
                JSON.parse(cached),
                await this.i18n.translate('warehouse_manager.rack_view_list_success', { lang }),
            );
        }

        const result = await this.repository.findRacksByRowId(rowId, query);

        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_VIEW_CACHE_TTL', 300);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return new GetResponse(
            'warehouse_manager.rack_view_list_success',
            result,
            await this.i18n.translate('warehouse_manager.rack_view_list_success', { lang }),
        );
    }

    /**
     * Lấy chi tiết rack
     */
    async findRackDetail(
        templateId: string,
        warehouseId: string,
        rowId: string,
        rackId: string,
        userId: string,
        lang: string,
    ): Promise<GetResponse<Rack>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);
        await this.verifyRowBelongsToWarehouse(rowId, warehouseId, lang);

        const rack = await this.repository.findRackById(rackId);
        if (!rack || rack.row_id !== rowId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.rack_not_found', { lang })
            );
        }

        return new GetResponse(
            'warehouse_manager.rack_view_detail_success',
            rack,
            await this.i18n.translate('warehouse_manager.rack_view_detail_success', { lang }),
        );
    }

    /**
     * Lấy danh sách shelves trong rack
     */
    async findShelvesByRack(
        templateId: string,
        warehouseId: string,
        rowId: string,
        rackId: string,
        query: QueryWarehouseManagerViewDto,
        userId: string,
        lang: string,
    ): Promise<GetResponse<IPaginatedResponse<Shelf>>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);
        await this.verifyRowBelongsToWarehouse(rowId, warehouseId, lang);
        await this.verifyRackBelongsToRow(rackId, rowId, lang);

        const cacheKey = `wm:view:shelves:${rackId}:${JSON.stringify(query)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return new GetResponse(
                'warehouse_manager.shelf_view_list_success',
                JSON.parse(cached),
                await this.i18n.translate('warehouse_manager.shelf_view_list_success', { lang }),
            );
        }

        const result = await this.repository.findShelvesByRackId(rackId, query);

        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_VIEW_CACHE_TTL', 300);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return new GetResponse(
            'warehouse_manager.shelf_view_list_success',
            result,
            await this.i18n.translate('warehouse_manager.shelf_view_list_success', { lang }),
        );
    }

    /**
     * Lấy chi tiết shelf
     */
    async findShelfDetail(
        templateId: string,
        warehouseId: string,
        rowId: string,
        rackId: string,
        shelfId: string,
        userId: string,
        lang: string,
    ): Promise<GetResponse<Shelf>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);
        await this.verifyRowBelongsToWarehouse(rowId, warehouseId, lang);
        await this.verifyRackBelongsToRow(rackId, rowId, lang);

        const shelf = await this.repository.findShelfById(shelfId);
        if (!shelf || shelf.rack_id !== rackId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.shelf_not_found', { lang })
            );
        }

        return new GetResponse(
            'warehouse_manager.shelf_view_detail_success',
            shelf,
            await this.i18n.translate('warehouse_manager.shelf_view_detail_success', { lang }),
        );
    }

    /**
     * Lấy danh sách blocks trong shelf
     */
    async findBlocksByShelf(
        templateId: string,
        warehouseId: string,
        rowId: string,
        rackId: string,
        shelfId: string,
        query: QueryWarehouseManagerViewDto,
        userId: string,
        lang: string,
    ): Promise<GetResponse<IPaginatedResponse<Block>>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);
        await this.verifyRowBelongsToWarehouse(rowId, warehouseId, lang);
        await this.verifyRackBelongsToRow(rackId, rowId, lang);
        await this.verifyShelfBelongsToRack(shelfId, rackId, lang);

        const cacheKey = `wm:view:blocks:${shelfId}:${JSON.stringify(query)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return new GetResponse(
                'warehouse_manager.block_view_list_success',
                JSON.parse(cached),
                await this.i18n.translate('warehouse_manager.block_view_list_success', { lang }),
            );
        }

        const result = await this.repository.findBlocksByShelfId(shelfId, query);

        const ttl = this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_VIEW_CACHE_TTL', 300);
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return new GetResponse(
            'warehouse_manager.block_view_list_success',
            result,
            await this.i18n.translate('warehouse_manager.block_view_list_success', { lang }),
        );
    }

    /**
     * Lấy chi tiết block
     */
    async findBlockDetail(
        templateId: string,
        warehouseId: string,
        rowId: string,
        rackId: string,
        shelfId: string,
        blockId: string,
        userId: string,
        lang: string,
    ): Promise<GetResponse<Block>> {
        await this.verifyWarehouseBelongsToTemplate(warehouseId, templateId, lang);
        await this.verifyRowBelongsToWarehouse(rowId, warehouseId, lang);
        await this.verifyRackBelongsToRow(rackId, rowId, lang);
        await this.verifyShelfBelongsToRack(shelfId, rackId, lang);

        const block = await this.repository.findBlockById(blockId);
        if (!block || block.shelf_id !== shelfId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.block_not_found', { lang })
            );
        }

        return new GetResponse(
            'warehouse_manager.block_view_detail_success',
            block,
            await this.i18n.translate('warehouse_manager.block_view_detail_success', { lang }),
        );
    }

    // ==================== HELPER METHODS ====================

    private async verifyWarehouseBelongsToTemplate(
        warehouseId: string,
        templateId: string,
        lang: string,
    ): Promise<void> {
        const warehouse = await this.repository.findWarehouseById(warehouseId);
        if (!warehouse || warehouse.warehouse_template_id !== templateId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.warehouse_not_found', { lang })
            );
        }
    }

    private async verifyRowBelongsToWarehouse(
        rowId: string,
        warehouseId: string,
        lang: string,
    ): Promise<void> {
        const row = await this.repository.findRowById(rowId);
        if (!row || row.warehouse_id !== warehouseId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.row_not_found', { lang })
            );
        }
    }

    private async verifyRackBelongsToRow(
        rackId: string,
        rowId: string,
        lang: string,
    ): Promise<void> {
        const rack = await this.repository.findRackById(rackId);
        if (!rack || rack.row_id !== rowId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.rack_not_found', { lang })
            );
        }
    }

    private async verifyShelfBelongsToRack(
        shelfId: string,
        rackId: string,
        lang: string,
    ): Promise<void> {
        const shelf = await this.repository.findShelfById(shelfId);
        if (!shelf || shelf.rack_id !== rackId) {
            throw new NotFoundException(
                await this.i18n.translate('warehouse_manager.errors.shelf_not_found', { lang })
            );
        }
    }
}
