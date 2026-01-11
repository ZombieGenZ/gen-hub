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
