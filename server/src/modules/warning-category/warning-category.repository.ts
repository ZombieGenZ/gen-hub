import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WarningCategory, Prisma } from '@prisma/client';
import { IWarningCategoryListResult } from './interfaces';

/**
 * Repository cho WarningCategory
 * Cung cấp các phương thức CRUD và truy vấn danh mục cảnh báo
 */
@Injectable()
export class WarningCategoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Tạo danh mục mới
     */
    async create(data: {
        name: string;
        description?: string;
        severity?: number;
        created_by: string;
    }): Promise<WarningCategory> {
        return this.prisma.warningCategory.create({
            data: {
                name: data.name,
                description: data.description,
                severity: data.severity ?? 1,
                created_by: data.created_by,
            },
        });
    }

    /**
     * Tìm danh mục theo ID
     */
    async findById(id: string): Promise<WarningCategory | null> {
        return this.prisma.warningCategory.findFirst({
            where: { id, is_deleted: false },
        });
    }

    /**
     * Lấy danh sách danh mục với phân trang
     */
    async findMany(params: {
        limit?: number;
        offset?: number;
        keywords?: string;
        status?: string;
    }): Promise<IWarningCategoryListResult> {
        const { limit = 10, offset = 0, keywords, status } = params;

        const where: Prisma.WarningCategoryWhereInput = {
            is_deleted: false,
        };

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
            ];
        }

        if (status === 'active') {
            where.is_active = true;
        } else if (status === 'inactive') {
            where.is_active = false;
        }

        const [items, total] = await Promise.all([
            this.prisma.warningCategory.findMany({
                where,
                skip: offset,
                take: limit,
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.warningCategory.count({ where }),
        ]);

        return { items, total, limit, offset };
    }

    /**
     * Lấy tất cả danh mục active (không phân trang - dùng cho dropdown)
     */
    async findAllActive(): Promise<WarningCategory[]> {
        return this.prisma.warningCategory.findMany({
            where: { is_deleted: false, is_active: true },
            orderBy: [{ severity: 'desc' }, { name: 'asc' }],
        });
    }

    /**
     * Cập nhật danh mục
     */
    async update(
        id: string,
        data: Prisma.WarningCategoryUpdateInput,
    ): Promise<WarningCategory> {
        return this.prisma.warningCategory.update({
            where: { id },
            data,
        });
    }

    /**
     * Xóa mềm danh mục
     */
    async softDelete(id: string, deletedBy: string): Promise<WarningCategory> {
        return this.prisma.warningCategory.update({
            where: { id },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }

    /**
     * Xóa mềm nhiều danh mục
     */
    async softDeleteMany(ids: string[], deletedBy: string): Promise<number> {
        const result = await this.prisma.warningCategory.updateMany({
            where: { id: { in: ids }, is_deleted: false },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
        return result.count;
    }

    /**
     * Kiểm tra danh mục có đang được sử dụng không
     */
    async isInUse(id: string): Promise<boolean> {
        const count = await this.prisma.userWarning.count({
            where: { category_id: id, is_deleted: false },
        });
        return count > 0;
    }
}
