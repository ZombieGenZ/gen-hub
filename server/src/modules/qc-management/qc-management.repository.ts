import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Repository cho QC Management
 * Xử lý database operations cho QCWarehouse, QCRow, QCPermission, QCWarehouseAssignment, QCRowAssignment
 */
@Injectable()
export class QCManagementRepository {
    constructor(private readonly prisma: PrismaService) { }

    // ============ QC WAREHOUSE ============

    /**
     * Tạo QCWarehouse mới (khi tạo WarehouseTemplate)
     */
    async createQCWarehouse(warehouseTemplateId: string, userId: string) {
        return this.prisma.qCWarehouse.create({
            data: {
                warehouse_template: { connect: { id: warehouseTemplateId } },
                created_by: userId,
            },
        });
    }

    /**
     * Tìm QCWarehouse theo WarehouseTemplate ID
     */
    async findQCWarehouseByTemplateId(warehouseTemplateId: string) {
        return this.prisma.qCWarehouse.findFirst({
            where: { warehouse_template_id: warehouseTemplateId, is_deleted: false },
        });
    }

    /**
     * Lấy danh sách QCWarehouses
     */
    async findQCWarehouses(limit: number = 20, offset: number = 0) {
        const [items, total] = await Promise.all([
            this.prisma.qCWarehouse.findMany({
                where: { is_deleted: false },
                include: {
                    warehouse_template: {
                        select: { id: true, name: true, description: true },
                    },
                    assignments: {
                        where: { is_deleted: false },
                        include: {
                            permissions: { include: { permission: true } },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.qCWarehouse.count({ where: { is_deleted: false } }),
        ]);
        return { items, total, limit, offset, hasMore: offset + items.length < total };
    }

    /**
     * Tìm QCWarehouse theo ID
     */
    async findQCWarehouseById(id: string) {
        return this.prisma.qCWarehouse.findFirst({
            where: { id, is_deleted: false },
            include: {
                warehouse_template: {
                    select: { id: true, name: true, description: true },
                },
                assignments: {
                    where: { is_deleted: false },
                    include: {
                        permissions: { include: { permission: true } },
                    },
                },
            },
        });
    }

    // ============ QC ROW ============

    /**
     * Tạo QCRow mới (khi tạo RowTemplate)
     */
    async createQCRow(rowTemplateId: string, qcWarehouseId: string, userId: string) {
        return this.prisma.qCRow.create({
            data: {
                row_template: { connect: { id: rowTemplateId } },
                qc_warehouse: { connect: { id: qcWarehouseId } },
                created_by: userId,
            },
        });
    }

    /**
     * Tìm QCRow theo RowTemplate ID
     */
    async findQCRowByTemplateId(rowTemplateId: string) {
        return this.prisma.qCRow.findFirst({
            where: { row_template_id: rowTemplateId, is_deleted: false },
        });
    }

    /**
     * Lấy danh sách QCRows của một QCWarehouse
     */
    async findQCRowsByWarehouseId(qcWarehouseId: string, limit: number = 50, offset: number = 0) {
        const [items, total] = await Promise.all([
            this.prisma.qCRow.findMany({
                where: { qc_warehouse_id: qcWarehouseId, is_deleted: false },
                include: {
                    row_template: {
                        select: { id: true, name: true, code: true },
                    },
                    assignments: {
                        where: { is_deleted: false },
                        include: {
                            permissions: { include: { permission: true } },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.qCRow.count({ where: { qc_warehouse_id: qcWarehouseId, is_deleted: false } }),
        ]);
        return { items, total, limit, offset, hasMore: offset + items.length < total };
    }

    // ============ QC PERMISSION ============

    /**
     * Lấy tất cả QC permissions
     */
    async findAllPermissions() {
        return this.prisma.qCPermission.findMany({
            where: { is_deleted: false },
            orderBy: { key: 'asc' },
        });
    }

    /**
     * Tìm permission theo key
     */
    async findPermissionByKey(key: string) {
        return this.prisma.qCPermission.findFirst({
            where: { key, is_deleted: false },
        });
    }

    /**
     * Tìm permissions theo IDs
     */
    async findPermissionsByIds(ids: string[]) {
        return this.prisma.qCPermission.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    // ============ QC WAREHOUSE ASSIGNMENT ============

    /**
     * Gán user vào QCWarehouse với permissions
     */
    async assignUserToWarehouse(
        qcWarehouseId: string,
        userId: string,
        permissionIds: string[],
        createdBy: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            // Tạo assignment
            const assignment = await tx.qCWarehouseAssignment.create({
                data: {
                    qc_warehouse_id: qcWarehouseId,
                    user_id: userId,
                    created_by: createdBy,
                },
            });

            // Thêm permissions
            if (permissionIds.length > 0) {
                await tx.qCWarehouseAssignmentPermission.createMany({
                    data: permissionIds.map((permId) => ({
                        assignment_id: assignment.id,
                        permission_id: permId,
                    })),
                });
            }

            return this.findWarehouseAssignmentById(assignment.id, tx);
        });
    }

    /**
     * Tìm warehouse assignment theo ID
     */
    async findWarehouseAssignmentById(id: string, tx?: Prisma.TransactionClient) {
        const client = tx || this.prisma;
        return client.qCWarehouseAssignment.findFirst({
            where: { id, is_deleted: false },
            include: {
                qc_warehouse: {
                    include: {
                        warehouse_template: { select: { id: true, name: true } },
                    },
                },
                permissions: { include: { permission: true } },
            },
        });
    }

    /**
     * Xóa phân công warehouse
     */
    async removeWarehouseAssignment(id: string, deletedBy: string) {
        return this.prisma.qCWarehouseAssignment.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    // ============ QC ROW ASSIGNMENT ============

    /**
     * Gán user vào QCRow với permissions
     */
    async assignUserToRow(
        qcRowId: string,
        userId: string,
        permissionIds: string[],
        createdBy: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const assignment = await tx.qCRowAssignment.create({
                data: {
                    qc_row_id: qcRowId,
                    user_id: userId,
                    created_by: createdBy,
                },
            });

            if (permissionIds.length > 0) {
                await tx.qCRowAssignmentPermission.createMany({
                    data: permissionIds.map((permId) => ({
                        assignment_id: assignment.id,
                        permission_id: permId,
                    })),
                });
            }

            return this.findRowAssignmentById(assignment.id, tx);
        });
    }

    /**
     * Tìm row assignment theo ID
     */
    async findRowAssignmentById(id: string, tx?: Prisma.TransactionClient) {
        const client = tx || this.prisma;
        return client.qCRowAssignment.findFirst({
            where: { id, is_deleted: false },
            include: {
                qc_row: {
                    include: {
                        row_template: { select: { id: true, name: true, code: true } },
                    },
                },
                permissions: { include: { permission: true } },
            },
        });
    }

    /**
     * Xóa phân công row
     */
    async removeRowAssignment(id: string, deletedBy: string) {
        return this.prisma.qCRowAssignment.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }
}
