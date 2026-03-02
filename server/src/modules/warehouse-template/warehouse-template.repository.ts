import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryWarehouseTemplateDto } from './dto';
import { IWarehouseTemplateWithRelations, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho WarehouseTemplate
 */
@Injectable()
export class WarehouseTemplateRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

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
        images: {
            where: { is_deleted: false },
            orderBy: { order: 'asc' as const },
            select: {
                id: true,
                url: true,
                thumbnail_url: true,
                file_id: true,
                original_name: true,
                size: true,
                order: true,
                created_at: true,
            },
        },
        rows: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
            include: {
                discount_configs: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' as const },
                    include: {
                        duration_tier: true,
                    },
                },
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
        discount_configs: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
            include: {
                duration_tier: true,
            },
        },
        addon_gifts: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
            include: {
                addon: true,
            },
        },
        insurance_gifts: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
            include: {
                insurance: true,
            },
        },
        managers: {
            where: { is_deleted: false, is_active: true },
            orderBy: { created_at: 'asc' as const },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
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
        images: {
            where: { is_deleted: false },
            orderBy: { order: 'asc' as const },
            take: 1, // Chỉ lấy ảnh đầu tiên cho list
            select: {
                id: true,
                url: true,
                thumbnail_url: true,
            },
        },
        _count: {
            select: {
                rows: { where: { is_deleted: false } },
                images: { where: { is_deleted: false } },
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
     * Find many by IDs
     */
    async findByIds(ids: string[]): Promise<{ id: string; name: string }[]> {
        return this.prisma.warehouseTemplate.findMany({
            where: { id: { in: ids }, is_deleted: false },
            select: { id: true, name: true },
        });
    }

    /**
     * Lấy danh sách với phân trang (bao gồm full rows hierarchy)
     */
    async findMany(
        query: QueryWarehouseTemplateDto,
        options?: { lightweightMode?: boolean },
    ): Promise<IPaginatedResponse<IWarehouseTemplateWithRelations>> {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);
        const { keywords, is_active, rental_status, province_id } = query;

        const where: Prisma.WarehouseTemplateWhereInput = {
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(rental_status && { rental_status }),
            ...(province_id && { ward: { province_id } }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        // Mặc định sử dụng fullInclude để lấy rows, dùng listInclude nếu cần lightweight
        const includeOption = options?.lightweightMode ? this.listInclude : this.fullInclude;

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
     * Xóa mềm WarehouseTemplate và cascade xóa tất cả entities liên quan
     * - WarehouseTemplateImage
     * - WarehouseDiscountTier  
     * - RowTemplate, RackTemplate, ShelfTemplate, BlockTemplate
     */
    async softDelete(
        id: string,
        deletedBy: string,
    ): Promise<IWarehouseTemplateWithRelations> {
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // Cascade soft delete images
            await tx.warehouseTemplateImage.updateMany({
                where: { warehouse_template_id: id, is_deleted: false },
                data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: deletedBy,
                },
            });

            // Cascade soft delete discount configs
            await tx.warehouseDiscountConfig.updateMany({
                where: { warehouse_template_id: id, is_deleted: false },
                data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: deletedBy,
                },
            });

            // Get all rows of this template to cascade delete nested entities
            const rows = await tx.rowTemplate.findMany({
                where: { warehouse_template_id: id, is_deleted: false },
                select: { id: true },
            });
            const rowIds = rows.map(r => r.id);

            if (rowIds.length > 0) {
                // Get all racks
                const racks = await tx.rackTemplate.findMany({
                    where: { row_template_id: { in: rowIds }, is_deleted: false },
                    select: { id: true },
                });
                const rackIds = racks.map(r => r.id);

                if (rackIds.length > 0) {
                    // Get all shelves
                    const shelves = await tx.shelfTemplate.findMany({
                        where: { rack_template_id: { in: rackIds }, is_deleted: false },
                        select: { id: true },
                    });
                    const shelfIds = shelves.map(s => s.id);

                    if (shelfIds.length > 0) {
                        // Cascade soft delete blocks
                        await tx.blockTemplate.updateMany({
                            where: { shelf_template_id: { in: shelfIds }, is_deleted: false },
                            data: {
                                is_deleted: true,
                                deleted_at: now,
                                deleted_by: deletedBy,
                            },
                        });
                    }

                    // Cascade soft delete shelves
                    await tx.shelfTemplate.updateMany({
                        where: { rack_template_id: { in: rackIds }, is_deleted: false },
                        data: {
                            is_deleted: true,
                            deleted_at: now,
                            deleted_by: deletedBy,
                        },
                    });
                }

                // Cascade soft delete racks
                await tx.rackTemplate.updateMany({
                    where: { row_template_id: { in: rowIds }, is_deleted: false },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: deletedBy,
                    },
                });

                // Cascade soft delete rows
                await tx.rowTemplate.updateMany({
                    where: { warehouse_template_id: id, is_deleted: false },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: deletedBy,
                    },
                });
            }

            // Finally soft delete the template itself
            return tx.warehouseTemplate.update({
                where: { id },
                data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: deletedBy,
                },
                include: this.fullInclude,
            });
        }) as unknown as IWarehouseTemplateWithRelations;
    }

    /**
     * Delete many templates (soft delete) với cascade xóa tất cả entities liên quan
     */
    async softDeleteMany(ids: string[], deletedBy: string): Promise<{ count: number }> {
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // Cascade soft delete images
            await tx.warehouseTemplateImage.updateMany({
                where: { warehouse_template_id: { in: ids }, is_deleted: false },
                data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: deletedBy,
                },
            });

            // Cascade soft delete discount configs
            await tx.warehouseDiscountConfig.updateMany({
                where: { warehouse_template_id: { in: ids }, is_deleted: false },
                data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: deletedBy,
                },
            });

            // Get all rows of these templates to cascade delete nested entities
            const rows = await tx.rowTemplate.findMany({
                where: { warehouse_template_id: { in: ids }, is_deleted: false },
                select: { id: true },
            });
            const rowIds = rows.map(r => r.id);

            if (rowIds.length > 0) {
                // Get all racks
                const racks = await tx.rackTemplate.findMany({
                    where: { row_template_id: { in: rowIds }, is_deleted: false },
                    select: { id: true },
                });
                const rackIds = racks.map(r => r.id);

                if (rackIds.length > 0) {
                    // Get all shelves
                    const shelves = await tx.shelfTemplate.findMany({
                        where: { rack_template_id: { in: rackIds }, is_deleted: false },
                        select: { id: true },
                    });
                    const shelfIds = shelves.map(s => s.id);

                    if (shelfIds.length > 0) {
                        // Cascade soft delete blocks
                        await tx.blockTemplate.updateMany({
                            where: { shelf_template_id: { in: shelfIds }, is_deleted: false },
                            data: {
                                is_deleted: true,
                                deleted_at: now,
                                deleted_by: deletedBy,
                            },
                        });
                    }

                    // Cascade soft delete shelves
                    await tx.shelfTemplate.updateMany({
                        where: { rack_template_id: { in: rackIds }, is_deleted: false },
                        data: {
                            is_deleted: true,
                            deleted_at: now,
                            deleted_by: deletedBy,
                        },
                    });
                }

                // Cascade soft delete racks
                await tx.rackTemplate.updateMany({
                    where: { row_template_id: { in: rowIds }, is_deleted: false },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: deletedBy,
                    },
                });

                // Cascade soft delete rows
                await tx.rowTemplate.updateMany({
                    where: { warehouse_template_id: { in: ids }, is_deleted: false },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: deletedBy,
                    },
                });
            }

            // Finally soft delete the templates
            return tx.warehouseTemplate.updateMany({
                where: { id: { in: ids } },
                data: {
                    is_deleted: true,
                    deleted_at: now,
                    deleted_by: deletedBy,
                },
            });
        });
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

    /**
     * Lấy tất cả rows của template, bao gồm cả đã xóa (dùng cho layout upsert/restore)
     */
    async findAllRowsByTemplateId(templateId: string, includeDeleted: boolean = false) {
        return this.prisma.rowTemplate.findMany({
            where: {
                warehouse_template_id: templateId,
                ...(includeDeleted ? {} : { is_deleted: false })
            },
            include: {
                racks: {
                    where: includeDeleted ? {} : { is_deleted: false },
                    include: {
                        shelves: {
                            where: includeDeleted ? {} : { is_deleted: false },
                            include: {
                                blocks: { where: includeDeleted ? {} : { is_deleted: false } },
                            },
                        },
                    },
                },
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
            rowIdsToRestore: string[];
            racksToCreate: Prisma.RackTemplateCreateManyInput[];
            racksToUpdate: { id: string; data: Prisma.RackTemplateUpdateInput }[];
            rackIdsToDelete: string[];
            rackIdsToRestore: string[];
            shelvesToCreate: Prisma.ShelfTemplateCreateManyInput[];
            shelvesToUpdate: { id: string; data: Prisma.ShelfTemplateUpdateInput }[];
            shelfIdsToDelete: string[];
            shelfIdsToRestore: string[];
            blocksToCreate: Prisma.BlockTemplateCreateManyInput[];
            blocksToUpdate: { id: string; data: Prisma.BlockTemplateUpdateInput }[];
            blockIdsToDelete: string[];
            blockIdsToRestore: string[];
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

            // Restore soft-deleted items (top-down) trước khi create/update
            if (operations.rowIdsToRestore.length > 0) {
                await tx.rowTemplate.updateMany({
                    where: { id: { in: operations.rowIdsToRestore } },
                    data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_by: userId },
                });
            }

            if (operations.rackIdsToRestore.length > 0) {
                await tx.rackTemplate.updateMany({
                    where: { id: { in: operations.rackIdsToRestore } },
                    data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_by: userId },
                });
            }

            if (operations.shelfIdsToRestore.length > 0) {
                await tx.shelfTemplate.updateMany({
                    where: { id: { in: operations.shelfIdsToRestore } },
                    data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_by: userId },
                });
            }

            if (operations.blockIdsToRestore.length > 0) {
                await tx.blockTemplate.updateMany({
                    where: { id: { in: operations.blockIdsToRestore } },
                    data: { is_deleted: false, deleted_at: null, deleted_by: null, updated_by: userId },
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

    /**
     * Tạo mới image cho template
     */
    async createImage(data: Prisma.WarehouseTemplateImageCreateInput) {
        return this.prisma.warehouseTemplateImage.create({ data });
    }

    /**
     * Tạo nhiều images
     */
    async createManyImages(data: Prisma.WarehouseTemplateImageCreateManyInput[]) {
        return this.prisma.warehouseTemplateImage.createMany({ data });
    }

    /**
     * Tìm image theo ID
     */
    async findImageById(id: string) {
        return this.prisma.warehouseTemplateImage.findFirst({
            where: { id, is_deleted: false },
        });
    }

    /**
     * Lấy danh sách images của template
     */
    async findImagesByTemplateId(templateId: string) {
        return this.prisma.warehouseTemplateImage.findMany({
            where: { warehouse_template_id: templateId, is_deleted: false },
            orderBy: { order: 'asc' },
        });
    }

    /**
     * Đếm số lượng images của template
     */
    async countImagesByTemplateId(templateId: string): Promise<number> {
        return this.prisma.warehouseTemplateImage.count({
            where: { warehouse_template_id: templateId, is_deleted: false },
        });
    }

    /**
     * Lấy order lớn nhất hiện tại
     */
    async getMaxImageOrder(templateId: string): Promise<number> {
        const result = await this.prisma.warehouseTemplateImage.aggregate({
            where: { warehouse_template_id: templateId, is_deleted: false },
            _max: { order: true },
        });
        return result._max.order ?? -1;
    }

    /**
     * Soft delete image
     */
    async softDeleteImage(id: string, deletedBy: string) {
        return this.prisma.warehouseTemplateImage.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    async findImagesByIds(ids: string[]) {
        return this.prisma.warehouseTemplateImage.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    async softDeleteManyImages(ids: string[], deletedBy: string) {
        return this.prisma.warehouseTemplateImage.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Cập nhật order của images (reorder)
     */
    async updateImageOrder(id: string, order: number) {
        return this.prisma.warehouseTemplateImage.update({
            where: { id },
            data: { order },
        });
    }

    /**
     * Batch update order cho nhiều images
     */
    async batchUpdateImageOrder(updates: { id: string; order: number }[]) {
        return this.prisma.$transaction(
            updates.map((u) =>
                this.prisma.warehouseTemplateImage.update({
                    where: { id: u.id },
                    data: { order: u.order },
                }),
            ),
        );
    }

    /**
     * Upsert discount configs cho warehouse template
     * - Create new configs
     * - Update existing configs
     * - Soft delete removed configs
     */
    async upsertDiscountConfigs(
        templateId: string,
        configsToCreate: Omit<Prisma.WarehouseDiscountConfigCreateManyInput, 'warehouse_template_id'>[],
        configsToUpdate: { id: string; data: Prisma.WarehouseDiscountConfigUpdateInput }[],
        configIdsToDelete: string[],
        userId: string,
    ): Promise<void> {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            // Delete configs
            if (configIdsToDelete.length > 0) {
                await tx.warehouseDiscountConfig.updateMany({
                    where: { id: { in: configIdsToDelete } },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: userId,
                    },
                });
            }

            // Create configs
            if (configsToCreate.length > 0) {
                // Manually set warehouse_template_id because createManyInput doesn't infer from context
                const dataWithTemplateId = configsToCreate.map(d => ({
                    ...d,
                    warehouse_template_id: templateId,
                }));
                await tx.warehouseDiscountConfig.createMany({
                    data: dataWithTemplateId,
                });
            }

            // Update configs (sequential)
            if (configsToUpdate.length > 0) {
                await Promise.all(
                    configsToUpdate.map(item =>
                        tx.warehouseDiscountConfig.update({
                            where: { id: item.id },
                            data: item.data,
                        }),
                    ),
                );
            }
        });
    }

    /**
     * Upsert addon gifts cho warehouse template
     */
    async upsertAddonGifts(
        templateId: string,
        createData: Prisma.WarehouseAddonGiftCreateManyInput[],
        updateData: { id: string; data: Prisma.WarehouseAddonGiftUpdateInput }[],
        deleteIds: string[],
        userId: string,
    ): Promise<void> {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            // Delete gifts
            if (deleteIds.length > 0) {
                await tx.warehouseAddonGift.updateMany({
                    where: { id: { in: deleteIds } },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: userId,
                    },
                });
            }

            // Create gifts
            if (createData.length > 0) {
                const dataWithTemplateId = createData.map(d => ({
                    ...d,
                    warehouse_template_id: templateId,
                }));
                await tx.warehouseAddonGift.createMany({
                    data: dataWithTemplateId,
                });
            }

            // Update gifts (sequential)
            if (updateData.length > 0) {
                await Promise.all(
                    updateData.map(item =>
                        tx.warehouseAddonGift.update({
                            where: { id: item.id },
                            data: item.data,
                        }),
                    ),
                );
            }
        });
    }

    /**
     * Upsert insurance gifts cho warehouse template
     */
    async upsertInsuranceGifts(
        templateId: string,
        createData: Prisma.WarehouseInsuranceGiftCreateManyInput[],
        updateData: { id: string; data: Prisma.WarehouseInsuranceGiftUpdateInput }[],
        deleteIds: string[],
        userId: string,
    ): Promise<void> {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            // Delete gifts
            if (deleteIds.length > 0) {
                await tx.warehouseInsuranceGift.updateMany({
                    where: { id: { in: deleteIds } },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: userId,
                    },
                });
            }

            // Create gifts
            if (createData.length > 0) {
                const dataWithTemplateId = createData.map(d => ({
                    ...d,
                    warehouse_template_id: templateId,
                }));
                await tx.warehouseInsuranceGift.createMany({
                    data: dataWithTemplateId,
                });
            }

            // Update gifts (sequential)
            if (updateData.length > 0) {
                await Promise.all(
                    updateData.map(item =>
                        tx.warehouseInsuranceGift.update({
                            where: { id: item.id },
                            data: item.data,
                        }),
                    ),
                );
            }
        });
    }

    /**
     * Upsert discount configs cho row template
     * - Create new configs
     * - Update existing configs
     * - Soft delete removed configs
     */
    async upsertRowDiscountConfigs(
        rowId: string,
        configsToCreate: Array<{
            duration_tier_id: string;
            discount_percent: any;
            is_active: boolean;
            created_by: string;
        }>,
        configsToUpdate: Array<{
            id: string;
            data: {
                discount_percent?: any;
                is_active?: boolean;
                updated_by?: string;
            };
        }>,
        configIdsToDelete: string[],
        userId: string,
    ): Promise<void> {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            // Soft delete configs không còn trong request
            if (configIdsToDelete.length > 0) {
                await tx.rowDiscountConfig.updateMany({
                    where: { id: { in: configIdsToDelete } },
                    data: {
                        is_deleted: true,
                        deleted_at: now,
                        deleted_by: userId,
                    },
                });
            }

            // Create new configs
            if (configsToCreate.length > 0) {
                await tx.rowDiscountConfig.createMany({
                    data: configsToCreate.map(c => ({
                        row_template_id: rowId,
                        duration_tier_id: c.duration_tier_id,
                        discount_percent: c.discount_percent,
                        is_active: c.is_active,
                        created_by: c.created_by,
                    })),
                });
            }

            // Update existing configs
            await Promise.all(
                configsToUpdate.map(c =>
                    tx.rowDiscountConfig.update({
                        where: { id: c.id },
                        data: c.data,
                    }),
                ),
            );
        });
    }

    /**
     * Lấy tất cả discount configs của một row
     */
    async findRowDiscountConfigs(rowId: string) {
        return this.prisma.rowDiscountConfig.findMany({
            where: { row_template_id: rowId, is_deleted: false },
            include: {
                duration_tier: true,
            },
        });
    }
}
