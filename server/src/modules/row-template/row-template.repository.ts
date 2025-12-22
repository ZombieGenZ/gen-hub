import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryRowTemplateDto } from './dto';

/**
 * Repository xử lý database operations cho RowTemplate
 */
@Injectable()
export class RowTemplateRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    /** Include relations cho row */
    private readonly fullInclude = {
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
    };

    /** Include nhẹ cho list */
    private readonly listInclude = {
        discount_configs: {
            where: { is_deleted: false },
            include: {
                duration_tier: true,
            },
        },
        _count: {
            select: {
                racks: { where: { is_deleted: false } },
            },
        },
    };

    async create(data: Prisma.RowTemplateCreateInput) {
        return this.prisma.rowTemplate.create({
            data,
            include: this.fullInclude,
        });
    }

    async findById(id: string) {
        return this.prisma.rowTemplate.findFirst({
            where: { id, is_deleted: false },
            include: this.fullInclude,
        });
    }

    async findByCode(warehouseTemplateId: string, code: string, excludeId?: string) {
        return this.prisma.rowTemplate.findFirst({
            where: {
                warehouse_template_id: warehouseTemplateId,
                code,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findMany(warehouseTemplateId: string, query: QueryRowTemplateDto) {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);
        const { keywords, is_active, is_rented } = query;

        const where: Prisma.RowTemplateWhereInput = {
            warehouse_template_id: warehouseTemplateId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(is_rented !== undefined && { is_rented }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.rowTemplate.findMany({
                where,
                include: this.listInclude,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.rowTemplate.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    async update(id: string, data: Prisma.RowTemplateUpdateInput) {
        return this.prisma.rowTemplate.update({
            where: { id },
            data,
            include: this.fullInclude,
        });
    }

    async softDelete(id: string, deletedBy: string) {
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // Cascade delete discount configs
            await tx.rowDiscountConfig.updateMany({
                where: { row_template_id: id, is_deleted: false },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });

            // Cascade delete nested entities
            const racks = await tx.rackTemplate.findMany({
                where: { row_template_id: id, is_deleted: false },
                select: { id: true },
            });
            const rackIds = racks.map(r => r.id);

            if (rackIds.length > 0) {
                const shelves = await tx.shelfTemplate.findMany({
                    where: { rack_template_id: { in: rackIds }, is_deleted: false },
                    select: { id: true },
                });
                const shelfIds = shelves.map(s => s.id);

                if (shelfIds.length > 0) {
                    await tx.blockTemplate.updateMany({
                        where: { shelf_template_id: { in: shelfIds }, is_deleted: false },
                        data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
                    });
                }

                await tx.shelfTemplate.updateMany({
                    where: { rack_template_id: { in: rackIds }, is_deleted: false },
                    data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
                });

                await tx.rackTemplate.updateMany({
                    where: { row_template_id: id, is_deleted: false },
                    data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
                });
            }

            // Soft delete row
            return tx.rowTemplate.update({
                where: { id },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });
        });
    }

    async softDeleteMany(ids: string[], deletedBy: string) {
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // Cascade delete discount configs
            await tx.rowDiscountConfig.updateMany({
                where: { row_template_id: { in: ids }, is_deleted: false },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });

            // Cascade delete nested entities
            const racks = await tx.rackTemplate.findMany({
                where: { row_template_id: { in: ids }, is_deleted: false },
                select: { id: true },
            });
            const rackIds = racks.map(r => r.id);

            if (rackIds.length > 0) {
                const shelves = await tx.shelfTemplate.findMany({
                    where: { rack_template_id: { in: rackIds }, is_deleted: false },
                    select: { id: true },
                });
                const shelfIds = shelves.map(s => s.id);

                if (shelfIds.length > 0) {
                    await tx.blockTemplate.updateMany({
                        where: { shelf_template_id: { in: shelfIds }, is_deleted: false },
                        data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
                    });
                }

                await tx.shelfTemplate.updateMany({
                    where: { rack_template_id: { in: rackIds }, is_deleted: false },
                    data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
                });

                await tx.rackTemplate.updateMany({
                    where: { row_template_id: { in: ids }, is_deleted: false },
                    data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
                });
            }

            return tx.rowTemplate.updateMany({
                where: { id: { in: ids } },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.rowTemplate.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    /** Kiểm tra warehouse template tồn tại */
    async warehouseTemplateExists(id: string) {
        const template = await this.prisma.warehouseTemplate.findFirst({
            where: { id, is_deleted: false },
            select: { id: true },
        });
        return !!template;
    }

    /** Lấy discount configs hiện có của row */
    async findDiscountConfigs(rowId: string) {
        return this.prisma.rowDiscountConfig.findMany({
            where: { row_template_id: rowId, is_deleted: false },
            select: { id: true, duration_tier_id: true },
        });
    }

    /** Upsert discount configs cho row */
    async upsertDiscountConfigs(
        rowId: string,
        configsToCreate: Prisma.RowDiscountConfigCreateManyInput[],
        configsToUpdate: { id: string; data: Prisma.RowDiscountConfigUpdateInput }[],
        configIdsToDelete: string[],
        userId: string,
    ) {
        const now = new Date();

        await this.prisma.$transaction(async (tx) => {
            // Delete configs that are not in the request
            if (configIdsToDelete.length > 0) {
                await tx.rowDiscountConfig.updateMany({
                    where: { id: { in: configIdsToDelete } },
                    data: { is_deleted: true, deleted_at: now, deleted_by: userId },
                });
            }

            // Create new configs
            if (configsToCreate.length > 0) {
                await tx.rowDiscountConfig.createMany({
                    data: configsToCreate.map(c => ({
                        ...c,
                        row_template_id: rowId,
                    })),
                });
            }

            // Update existing configs
            for (const config of configsToUpdate) {
                await tx.rowDiscountConfig.update({
                    where: { id: config.id },
                    data: config.data,
                });
            }
        });
    }
}
