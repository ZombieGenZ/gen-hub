import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';

import { QCManagementRepository } from './qc-management.repository';
import { RedisService } from '../redis/redis.service';
import { SystemLogService } from '../system-log/system-log.service';

/**
 * Service cho QC Management
 * Xử lý business logic cho QCWarehouse, QCRow, QCPermission
 */
@Injectable()
export class QCManagementService {
    private readonly QC_WAREHOUSE_CACHE_TTL: number;
    private readonly QC_ROW_CACHE_TTL: number;
    private readonly QC_PERMISSION_CACHE_TTL: number;
    private readonly QC_RACK_CACHE_TTL: number;
    private readonly QC_SHELF_CACHE_TTL: number;
    private readonly QC_BLOCK_CACHE_TTL: number;

    constructor(
        private readonly repository: QCManagementRepository,
        private readonly redisService: RedisService,
        private readonly systemLogService: SystemLogService,
        private readonly i18n: I18nService,
        private readonly configService: ConfigService,
    ) {
        this.QC_WAREHOUSE_CACHE_TTL = this.configService.get<number>('REDIS_QC_WAREHOUSE_CACHE_TTL', 300);
        this.QC_ROW_CACHE_TTL = this.configService.get<number>('REDIS_QC_ROW_CACHE_TTL', 300);
        this.QC_PERMISSION_CACHE_TTL = this.configService.get<number>('REDIS_QC_PERMISSION_CACHE_TTL', 300);
        this.QC_RACK_CACHE_TTL = this.configService.get<number>('REDIS_QC_RACK_CACHE_TTL', 300);
        this.QC_SHELF_CACHE_TTL = this.configService.get<number>('REDIS_QC_SHELF_CACHE_TTL', 300);
        this.QC_BLOCK_CACHE_TTL = this.configService.get<number>('REDIS_QC_BLOCK_CACHE_TTL', 300);
    }

    /**
     * Tạo QCWarehouse khi tạo WarehouseTemplate
     * Được gọi từ warehouse-template.service.ts
     */
    async createQCWarehouseForTemplate(warehouseTemplateId: string, userId: string) {
        const qcWarehouse = await this.repository.createQCWarehouse(warehouseTemplateId, userId);

        this.systemLogService.info(
            'qc-management',
            'create-qc-warehouse',
            `Created QCWarehouse for template ${warehouseTemplateId}`,
            { userId, metaData: { qcWarehouseId: qcWarehouse.id, warehouseTemplateId } },
        );

        return qcWarehouse;
    }

    /**
     * Lấy danh sách QCWarehouses
     */
    async getQCWarehouses(limit: number = 20, offset: number = 0) {
        const cacheKey = `qc:warehouses:list:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findQCWarehouses(limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_WAREHOUSE_CACHE_TTL);
        return result;
    }

    /**
     * Lấy chi tiết QCWarehouse
     */
    async getQCWarehouseById(id: string, lang: string) {
        const cacheKey = `qc:warehouse:${id}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const qcWarehouse = await this.repository.findQCWarehouseById(id);
        if (!qcWarehouse) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.warehouse_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(qcWarehouse), this.QC_WAREHOUSE_CACHE_TTL);
        return qcWarehouse;
    }

    /**
     * Tạo QCRow khi tạo RowTemplate
     * Được gọi từ row-template.service.ts
     */
    async createQCRowForTemplate(rowTemplateId: string, warehouseTemplateId: string, userId: string) {
        // Tìm QCWarehouse tương ứng
        const qcWarehouse = await this.repository.findQCWarehouseByTemplateId(warehouseTemplateId);
        if (!qcWarehouse) {
            throw new BadRequestException('QCWarehouse not found for this WarehouseTemplate');
        }

        const qcRow = await this.repository.createQCRow(rowTemplateId, qcWarehouse.id, userId);

        this.systemLogService.info(
            'qc-management',
            'create-qc-row',
            `Created QCRow for template ${rowTemplateId}`,
            { userId, metaData: { qcRowId: qcRow.id, rowTemplateId, qcWarehouseId: qcWarehouse.id } },
        );

        return qcRow;
    }

    /**
     * Lấy danh sách QCRows của một QCWarehouse
     */
    async getQCRowsByWarehouseId(qcWarehouseId: string, limit: number = 50, offset: number = 0) {
        const cacheKey = `qc:rows:list:${qcWarehouseId}:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const result = await this.repository.findQCRowsByWarehouseId(qcWarehouseId, limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_ROW_CACHE_TTL);
        return result;
    }

    /**
     * Lấy tất cả QC permissions
     */
    async getAllPermissions() {
        const cacheKey = 'qc:permissions:all';
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const permissions = await this.repository.findAllPermissions();
        await this.redisService.set(cacheKey, JSON.stringify(permissions), this.QC_PERMISSION_CACHE_TTL);
        return permissions;
    }

    /**
     * Gán user vào QCWarehouse với permissions
     */
    async assignUserToWarehouse(
        qcWarehouseId: string,
        userId: string,
        permissionIds: string[],
        currentUserId: string,
        lang: string,
    ) {
        // Validate QCWarehouse
        const qcWarehouse = await this.repository.findQCWarehouseById(qcWarehouseId);
        if (!qcWarehouse) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.warehouse_not_found', { lang }),
            );
        }

        // Validate permissions
        if (permissionIds.length > 0) {
            const permissions = await this.repository.findPermissionsByIds(permissionIds);
            if (permissions.length !== permissionIds.length) {
                throw new BadRequestException(
                    this.i18n.t('qc-management.errors.invalid_permissions', { lang }),
                );
            }
        }

        const assignment = await this.repository.assignUserToWarehouse(
            qcWarehouseId,
            userId,
            permissionIds,
            currentUserId,
        );

        // Invalidate cache
        await this.invalidateWarehouseCache(qcWarehouseId);

        this.systemLogService.info(
            'qc-management',
            'assign-user-warehouse',
            `Assigned user ${userId} to QCWarehouse ${qcWarehouseId}`,
            { userId: currentUserId, metaData: { assignmentId: assignment?.id, targetUserId: userId, permissionIds } },
        );

        return assignment;
    }

    /**
     * Xóa phân công warehouse
     */
    async removeWarehouseAssignment(assignmentId: string, currentUserId: string, lang: string) {
        const assignment = await this.repository.findWarehouseAssignmentById(assignmentId);
        if (!assignment) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.assignment_not_found', { lang }),
            );
        }

        await this.repository.removeWarehouseAssignment(assignmentId, currentUserId);

        // Invalidate cache
        await this.invalidateWarehouseCache(assignment.qc_warehouse_id);

        this.systemLogService.info(
            'qc-management',
            'remove-warehouse-assignment',
            `Removed warehouse assignment ${assignmentId}`,
            { userId: currentUserId, metaData: { assignmentId } },
        );
    }

    /**
     * Gán user vào QCRow với permissions
     */
    async assignUserToRow(
        qcRowId: string,
        userId: string,
        permissionIds: string[],
        currentUserId: string,
        lang: string,
    ) {
        // Validate permissions
        if (permissionIds.length > 0) {
            const permissions = await this.repository.findPermissionsByIds(permissionIds);
            if (permissions.length !== permissionIds.length) {
                throw new BadRequestException(
                    this.i18n.t('qc-management.errors.invalid_permissions', { lang }),
                );
            }
        }

        const assignment = await this.repository.assignUserToRow(
            qcRowId,
            userId,
            permissionIds,
            currentUserId,
        );

        this.systemLogService.info(
            'qc-management',
            'assign-user-row',
            `Assigned user ${userId} to QCRow ${qcRowId}`,
            { userId: currentUserId, metaData: { assignmentId: assignment?.id, targetUserId: userId, permissionIds } },
        );

        return assignment;
    }

    /**
     * Xóa phân công row
     */
    async removeRowAssignment(assignmentId: string, currentUserId: string, lang: string) {
        const assignment = await this.repository.findRowAssignmentById(assignmentId);
        if (!assignment) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.assignment_not_found', { lang }),
            );
        }

        await this.repository.removeRowAssignment(assignmentId, currentUserId);

        this.systemLogService.info(
            'qc-management',
            'remove-row-assignment',
            `Removed row assignment ${assignmentId}`,
            { userId: currentUserId, metaData: { assignmentId } },
        );
    }

    /**
     * Lấy danh sách Warehouses của QCWarehouse
     */
    async getWarehousesByQCWarehouseId(qcWarehouseId: string, limit: number = 50, offset: number = 0, lang: string = 'vi') {
        // Validate QCWarehouse tồn tại
        const qcWarehouse = await this.repository.findQCWarehouseById(qcWarehouseId);
        if (!qcWarehouse) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.qc_warehouse_not_found', { lang }),
            );
        }

        const cacheKey = `qc:warehouses:by-qc:${qcWarehouseId}:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findWarehousesByQCWarehouseId(qcWarehouseId, limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_WAREHOUSE_CACHE_TTL);
        return result;
    }

    /**
     * Lấy chi tiết Warehouse
     */
    async getWarehouseById(warehouseId: string, lang: string = 'vi') {
        const cacheKey = `qc:warehouse:detail:${warehouseId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const warehouse = await this.repository.findWarehouseById(warehouseId);
        if (!warehouse) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.warehouse_detail_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(warehouse), this.QC_WAREHOUSE_CACHE_TTL);
        return warehouse;
    }

    /**
     * Lấy chi tiết QCRow
     */
    async getQCRowById(qcRowId: string, lang: string = 'vi') {
        const cacheKey = `qc:qcrow:detail:${qcRowId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const qcRow = await this.repository.findQCRowById(qcRowId);
        if (!qcRow) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.row_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(qcRow), this.QC_ROW_CACHE_TTL);
        return qcRow;
    }

    /**
     * Lấy danh sách Rows của QCRow
     */
    async getRowsByQCRowId(qcRowId: string, limit: number = 50, offset: number = 0, lang: string = 'vi') {
        // Validate QCRow tồn tại
        const qcRow = await this.repository.findQCRowById(qcRowId);
        if (!qcRow) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.row_not_found', { lang }),
            );
        }

        const cacheKey = `qc:rows:by-qcrow:${qcRowId}:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findRowsByQCRowId(qcRowId, limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_ROW_CACHE_TTL);
        return result;
    }

    /**
     * Lấy chi tiết Row
     */
    async getRowById(rowId: string, lang: string = 'vi') {
        const cacheKey = `qc:row:detail:${rowId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const row = await this.repository.findRowById(rowId);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.row_detail_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(row), this.QC_ROW_CACHE_TTL);
        return row;
    }

    /**
     * Lấy danh sách Racks của Row
     */
    async getRacksByRowId(rowId: string, limit: number = 50, offset: number = 0, lang: string = 'vi') {
        // Validate Row tồn tại
        const row = await this.repository.findRowById(rowId);
        if (!row) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.row_detail_not_found', { lang }),
            );
        }

        const cacheKey = `qc:racks:by-row:${rowId}:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findRacksByRowId(rowId, limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_RACK_CACHE_TTL);
        return result;
    }

    /**
     * Lấy chi tiết Rack
     */
    async getRackById(rackId: string, lang: string = 'vi') {
        const cacheKey = `qc:rack:detail:${rackId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const rack = await this.repository.findRackById(rackId);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.rack_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(rack), this.QC_RACK_CACHE_TTL);
        return rack;
    }

    /**
     * Lấy danh sách Shelves của Rack
     */
    async getShelvesByRackId(rackId: string, limit: number = 50, offset: number = 0, lang: string = 'vi') {
        // Validate Rack tồn tại
        const rack = await this.repository.findRackById(rackId);
        if (!rack) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.rack_not_found', { lang }),
            );
        }

        const cacheKey = `qc:shelves:by-rack:${rackId}:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findShelvesByRackId(rackId, limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_SHELF_CACHE_TTL);
        return result;
    }

    /**
     * Lấy chi tiết Shelf
     */
    async getShelfById(shelfId: string, lang: string = 'vi') {
        const cacheKey = `qc:shelf:detail:${shelfId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const shelf = await this.repository.findShelfById(shelfId);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.shelf_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(shelf), this.QC_SHELF_CACHE_TTL);
        return shelf;
    }

    /**
     * Lấy danh sách Blocks của Shelf
     */
    async getBlocksByShelfId(shelfId: string, limit: number = 50, offset: number = 0, lang: string = 'vi') {
        // Validate Shelf tồn tại
        const shelf = await this.repository.findShelfById(shelfId);
        if (!shelf) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.shelf_not_found', { lang }),
            );
        }

        const cacheKey = `qc:blocks:by-shelf:${shelfId}:${limit}:${offset}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const result = await this.repository.findBlocksByShelfId(shelfId, limit, offset);
        await this.redisService.set(cacheKey, JSON.stringify(result), this.QC_BLOCK_CACHE_TTL);
        return result;
    }

    /**
     * Lấy chi tiết Block
     */
    async getBlockById(blockId: string, lang: string = 'vi') {
        const cacheKey = `qc:block:detail:${blockId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const block = await this.repository.findBlockById(blockId);
        if (!block) {
            throw new NotFoundException(
                this.i18n.t('qc-management.errors.block_not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(block), this.QC_BLOCK_CACHE_TTL);
        return block;
    }

    private async invalidateWarehouseCache(qcWarehouseId: string) {
        const patterns = [
            `qc:warehouse:${qcWarehouseId}`,
            'qc:warehouses:list:*',
        ];
        for (const pattern of patterns) {
            await this.redisService.delByPattern(pattern);
        }
    }
}

