import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryWarehouseTemplateDto } from './dto';
import { IWarehouseTemplateWithRelations, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho WarehouseTemplate
 */
@Injectable()
export class WarehouseTemplateRepository {
    constructor(private readonly prisma: PrismaService) { }

    /** Include relations đầy đủ */
    private readonly fullInclude = {
        ward: {
            select: {
                id: true,
                name: true,
                code: true,
                type: true,
                province: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
            },
        },
        rows: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
            include: {
                racks: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' as const },
                    include: {
                        shelves: {
                            where: { is_deleted: false },
                            orderBy: { created_at: 'asc' as const },
                            include: {
                                blocks: {
                                    where: { is_deleted: false },
                                    orderBy: { created_at: 'asc' as const },
                                },
                            },
                        },
                    },
                },
            },
        },
    };

    /** Lightweight include for list queries - không load nested rows */
    private readonly listInclude = {
        ward: {
            select: {
                id: true,
                name: true,
                code: true,
                type: true,
                province: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                    },
                },
            },
        },
        _count: {
            select: {
                rows: { where: { is_deleted: false } },
            },
        },
    };

    /**
     * Tạo mới WarehouseTemplate
     */
    async create(
        data: Prisma.WarehouseTemplateCreateInput,
    ): Promise<IWarehouseTemplateWithRelations> {
        return this.prisma.warehouseTemplate.create({
            data,
            include: this.fullInclude,
        }) as unknown as IWarehouseTemplateWithRelations;
    }

    /**
     * Tìm theo ID
     */
    async findById(id: string): Promise<IWarehouseTemplateWithRelations | null> {
        return this.prisma.warehouseTemplate.findFirst({
            where: { id, is_deleted: false },
            include: this.fullInclude,
        }) as unknown as IWarehouseTemplateWithRelations | null;
    }

    /**
     * Tìm theo tên (kiểm tra trùng)
     */
    async findByName(name: string, excludeId?: string): Promise<boolean> {
        const existing = await this.prisma.warehouseTemplate.findFirst({
            where: {
                name,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
        return !!existing;
    }

    /**
     * Lấy danh sách với phân trang (lightweight - không load nested rows)
     * Dùng cho list/search operations
     */
    async findMany(
        query: QueryWarehouseTemplateDto,
        options?: { includeFullRelations?: boolean },
    ): Promise<IPaginatedResponse<IWarehouseTemplateWithRelations>> {
        const { limit = 10, offset = 0, keywords, is_active } = query;

        const where: Prisma.WarehouseTemplateWhereInput = {
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        // Sử dụng lightweight include mặc định để giảm data transfer
        const includeOption = options?.includeFullRelations ? this.fullInclude : this.listInclude;

        const [items, total] = await Promise.all([
            this.prisma.warehouseTemplate.findMany({
                where,
                include: includeOption,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.warehouseTemplate.count({ where }),
        ]);

        return {
            items: items as unknown as IWarehouseTemplateWithRelations[],
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    /**
     * Cập nhật WarehouseTemplate
     */
    async update(
        id: string,
        data: Prisma.WarehouseTemplateUpdateInput,
    ): Promise<IWarehouseTemplateWithRelations> {
        return this.prisma.warehouseTemplate.update({
            where: { id },
            data,
            include: this.fullInclude,
        }) as unknown as IWarehouseTemplateWithRelations;
    }

    /**
     * Xóa mềm WarehouseTemplate
     */
    async softDelete(
        id: string,
        deletedBy: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        return this.prisma.warehouseTemplate.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
            include: this.fullInclude,
        }) as unknown as IWarehouseTemplateWithRelations;
    }

    async createRow(data: Prisma.RowTemplateCreateInput) {
        return this.prisma.rowTemplate.create({ data });
    }

    async updateRow(id: string, data: Prisma.RowTemplateUpdateInput) {
        return this.prisma.rowTemplate.update({ where: { id }, data });
    }

    async softDeleteRow(id: string, deletedBy: string) {
        return this.prisma.rowTemplate.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findRowsByTemplateId(templateId: string) {
        return this.prisma.rowTemplate.findMany({
            where: { warehouse_template_id: templateId, is_deleted: false },
            include: {
                racks: {
                    where: { is_deleted: false },
                    include: {
                        shelves: {
                            where: { is_deleted: false },
                            include: {
                                blocks: { where: { is_deleted: false } },
                            },
                        },
                    },
                },
            },
        });
    }

    async createRack(data: Prisma.RackTemplateCreateInput) {
        return this.prisma.rackTemplate.create({ data });
    }

    async updateRack(id: string, data: Prisma.RackTemplateUpdateInput) {
        return this.prisma.rackTemplate.update({ where: { id }, data });
    }

    async softDeleteRack(id: string, deletedBy: string) {
        return this.prisma.rackTemplate.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async createShelf(data: Prisma.ShelfTemplateCreateInput) {
        return this.prisma.shelfTemplate.create({ data });
    }

    async updateShelf(id: string, data: Prisma.ShelfTemplateUpdateInput) {
        return this.prisma.shelfTemplate.update({ where: { id }, data });
    }

    async softDeleteShelf(id: string, deletedBy: string) {
        return this.prisma.shelfTemplate.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async createBlock(data: Prisma.BlockTemplateCreateInput) {
        return this.prisma.blockTemplate.create({ data });
    }

    async updateBlock(id: string, data: Prisma.BlockTemplateUpdateInput) {
        return this.prisma.blockTemplate.update({ where: { id }, data });
    }

    async softDeleteBlock(id: string, deletedBy: string) {
        return this.prisma.blockTemplate.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Batch create rows - single query thay vì N queries
     */
    async createManyRows(
        data: Prisma.RowTemplateCreateManyInput[],
    ): Promise<{ count: number }> {
        return this.prisma.rowTemplate.createMany({ data });
    }

    /**
     * Batch soft delete rows
     */
    async softDeleteManyRows(ids: string[], deletedBy: string): Promise<{ count: number }> {
        return this.prisma.rowTemplate.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Batch create racks
     */
    async createManyRacks(
        data: Prisma.RackTemplateCreateManyInput[],
    ): Promise<{ count: number }> {
        return this.prisma.rackTemplate.createMany({ data });
    }

    /**
     * Batch soft delete racks
     */
    async softDeleteManyRacks(ids: string[], deletedBy: string): Promise<{ count: number }> {
        return this.prisma.rackTemplate.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Batch create shelves
     */
    async createManyShelves(
        data: Prisma.ShelfTemplateCreateManyInput[],
    ): Promise<{ count: number }> {
        return this.prisma.shelfTemplate.createMany({ data });
    }

    /**
     * Batch soft delete shelves
     */
    async softDeleteManyShelves(ids: string[], deletedBy: string): Promise<{ count: number }> {
        return this.prisma.shelfTemplate.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Batch create blocks
     */
    async createManyBlocks(
        data: Prisma.BlockTemplateCreateManyInput[],
    ): Promise<{ count: number }> {
        return this.prisma.blockTemplate.createMany({ data });
    }

    /**
     * Batch soft delete blocks
     */
    async softDeleteManyBlocks(ids: string[], deletedBy: string): Promise<{ count: number }> {
        return this.prisma.blockTemplate.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Bulk upsert layout trong single transaction
     * Giảm từ N queries xuống còn vài batch queries
     */
    async bulkUpsertLayout(
        operations: {
            rowsToCreate: Prisma.RowTemplateCreateManyInput[];
            rowsToUpdate: { id: string; data: Prisma.RowTemplateUpdateInput }[];
            rowIdsToDelete: string[];
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
        userId: string,
    ): Promise<void> {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            // Batch deletes (bottom-up để tránh FK constraint)
            if (operations.blockIdsToDelete.length > 0) {
                await tx.blockTemplate.updateMany({
                    where: { id: { in: operations.blockIdsToDelete } },
                    data: { is_deleted: true, deleted_at: now, deleted_by: userId },
                });
            }

            if (operations.shelfIdsToDelete.length > 0) {
                await tx.shelfTemplate.updateMany({
                    where: { id: { in: operations.shelfIdsToDelete } },
                    data: { is_deleted: true, deleted_at: now, deleted_by: userId },
                });
            }

            if (operations.rackIdsToDelete.length > 0) {
                await tx.rackTemplate.updateMany({
                    where: { id: { in: operations.rackIdsToDelete } },
                    data: { is_deleted: true, deleted_at: now, deleted_by: userId },
                });
            }

            if (operations.rowIdsToDelete.length > 0) {
                await tx.rowTemplate.updateMany({
                    where: { id: { in: operations.rowIdsToDelete } },
                    data: { is_deleted: true, deleted_at: now, deleted_by: userId },
                });
            }

            // Batch creates (top-down)
            if (operations.rowsToCreate.length > 0) {
                await tx.rowTemplate.createMany({ data: operations.rowsToCreate });
            }

            if (operations.racksToCreate.length > 0) {
                await tx.rackTemplate.createMany({ data: operations.racksToCreate });
            }

            if (operations.shelvesToCreate.length > 0) {
                await tx.shelfTemplate.createMany({ data: operations.shelvesToCreate });
            }

            if (operations.blocksToCreate.length > 0) {
                await tx.blockTemplate.createMany({ data: operations.blocksToCreate });
            }

            // Updates phải sequential vì updateMany không hỗ trợ different data per record
            // Nhưng vẫn trong 1 transaction nên atomic
            await Promise.all([
                ...operations.rowsToUpdate.map((r) =>
                    tx.rowTemplate.update({ where: { id: r.id }, data: r.data }),
                ),
                ...operations.racksToUpdate.map((r) =>
                    tx.rackTemplate.update({ where: { id: r.id }, data: r.data }),
                ),
                ...operations.shelvesToUpdate.map((s) =>
                    tx.shelfTemplate.update({ where: { id: s.id }, data: s.data }),
                ),
                ...operations.blocksToUpdate.map((b) =>
                    tx.blockTemplate.update({ where: { id: b.id }, data: b.data }),
                ),
            ]);
        });
    }

    /**
     * Transaction wrapper
     */
    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}
