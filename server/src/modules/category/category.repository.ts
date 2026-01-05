import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ICategoryWithRelations } from './interfaces';

@Injectable()
export class CategoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.CategoryCreateInput): Promise<ICategoryWithRelations> {
        return this.prisma.category.create({
            data,
            include: {
                parent: true,
                _count: {
                    select: {
                        articles: true,
                        children: true,
                    },
                },
            },
        });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.CategoryWhereInput;
        orderBy?: Prisma.CategoryOrderByWithRelationInput;
    }): Promise<ICategoryWithRelations[]> {
        const { skip, take, where, orderBy } = params;
        return this.prisma.category.findMany({
            skip,
            take,
            where,
            orderBy,
            include: {
                parent: true,
                _count: {
                    select: {
                        articles: true,
                        children: true,
                    },
                },
            },
        });
    }

    async count(where?: Prisma.CategoryWhereInput): Promise<number> {
        return this.prisma.category.count({ where });
    }

    async findById(id: string): Promise<ICategoryWithRelations | null> {
        return this.prisma.category.findFirst({
            where: { id, is_deleted: false },
            include: {
                parent: true,
                children: {
                    where: { is_deleted: false },
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: {
                        articles: true,
                        children: true,
                    },
                },
            },
        });
    }

    async findBySlug(slug: string): Promise<ICategoryWithRelations | null> {
        return this.prisma.category.findFirst({
            where: { slug, is_deleted: false },
            include: {
                parent: true,
                _count: {
                    select: {
                        articles: true,
                        children: true,
                    },
                },
            },
        });
    }

    /**
     * Lấy tất cả category đang active và published
     */
    async findAllActive(): Promise<ICategoryWithRelations[]> {
        return this.prisma.category.findMany({
            where: {
                is_active: true,
                is_deleted: false,
                status: 'PUBLISHED',
            },
            orderBy: { order: 'asc' },
            include: {
                parent: true,
                children: {
                    where: { is_active: true, is_deleted: false, status: 'PUBLISHED' },
                    orderBy: { order: 'asc' },
                },
                _count: {
                    select: {
                        articles: true,
                        children: true,
                    },
                },
            },
        });
    }

    async update(id: string, data: Prisma.CategoryUpdateInput): Promise<ICategoryWithRelations> {
        return this.prisma.category.update({
            where: { id },
            data,
            include: {
                parent: true,
                _count: {
                    select: {
                        articles: true,
                        children: true,
                    },
                },
            },
        });
    }

    async softDelete(id: string, userId: string): Promise<ICategoryWithRelations> {
        return this.prisma.category.update({
            where: { id },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    async findByIds(ids: string[]): Promise<ICategoryWithRelations[]> {
        return this.prisma.category.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    async softDeleteMany(ids: string[], userId: string): Promise<void> {
        await this.prisma.category.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        // Cập nhật các bản mapping ArticleCategory
        await this.prisma.articleCategory.updateMany({
            where: { category_id: { in: ids } },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
        const category = await this.prisma.category.findFirst({
            where: {
                slug,
                is_deleted: false,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
        return !!category;
    }
}
