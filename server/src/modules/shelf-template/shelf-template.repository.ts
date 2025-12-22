import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryShelfTemplateDto } from './dto';

/**
 * Repository xử lý database operations cho ShelfTemplate
 */
@Injectable()
export class ShelfTemplateRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    /** Include relations cho shelf */
    private readonly fullInclude = {
        blocks: {
            where: { is_deleted: false },
            orderBy: { created_at: 'asc' as const },
        },
    };

    /** Include nhẹ cho list */
    private readonly listInclude = {
        _count: {
            select: {
                blocks: { where: { is_deleted: false } },
            },
        },
    };

    async create(data: Prisma.ShelfTemplateCreateInput) {
        return this.prisma.shelfTemplate.create({
            data,
            include: this.fullInclude,
        });
    }

    async findById(id: string) {
        return this.prisma.shelfTemplate.findFirst({
            where: { id, is_deleted: false },
            include: this.fullInclude,
        });
    }

    async findByCode(rackTemplateId: string, code: string, excludeId?: string) {
        return this.prisma.shelfTemplate.findFirst({
            where: {
                rack_template_id: rackTemplateId,
                code,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }

    async findMany(rackTemplateId: string, query: QueryShelfTemplateDto) {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);
        const { keywords, is_active } = query;

        const where: Prisma.ShelfTemplateWhereInput = {
            rack_template_id: rackTemplateId,
            is_deleted: false,
            ...(is_active !== undefined && { is_active }),
            ...(keywords && {
                OR: [
                    { name: { contains: keywords, mode: 'insensitive' } },
                    { code: { contains: keywords, mode: 'insensitive' } },
                    { description: { contains: keywords, mode: 'insensitive' } },
                ],
            }),
        };

        const [items, total] = await Promise.all([
            this.prisma.shelfTemplate.findMany({
                where,
                include: this.listInclude,
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.shelfTemplate.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    async update(id: string, data: Prisma.ShelfTemplateUpdateInput) {
        return this.prisma.shelfTemplate.update({
            where: { id },
            data,
            include: this.fullInclude,
        });
    }

    async softDelete(id: string, deletedBy: string) {
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // Cascade delete blocks
            await tx.blockTemplate.updateMany({
                where: { shelf_template_id: id, is_deleted: false },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });

            // Soft delete shelf
            return tx.shelfTemplate.update({
                where: { id },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });
        });
    }

    async softDeleteMany(ids: string[], deletedBy: string) {
        const now = new Date();

        return this.prisma.$transaction(async (tx) => {
            // Cascade delete blocks
            await tx.blockTemplate.updateMany({
                where: { shelf_template_id: { in: ids }, is_deleted: false },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });

            return tx.shelfTemplate.updateMany({
                where: { id: { in: ids } },
                data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
            });
        });
    }

    async findByIds(ids: string[]) {
        return this.prisma.shelfTemplate.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    /** Kiểm tra rack template tồn tại và lấy parent info */
    async rackTemplateExists(id: string) {
        const rack = await this.prisma.rackTemplate.findFirst({
            where: { id, is_deleted: false },
            select: {
                id: true,
                row_template_id: true,
                row_template: {
                    select: { warehouse_template_id: true },
                },
            },
        });
        return rack;
    }
}
