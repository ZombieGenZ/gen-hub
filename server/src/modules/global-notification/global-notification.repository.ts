import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryGlobalNotificationDto } from './dto';
import { IGlobalNotification, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho GlobalNotification
 */
@Injectable()
export class GlobalNotificationRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    // Tạo mới GlobalNotification
    async create(data: Prisma.GlobalNotificationCreateInput): Promise<IGlobalNotification> {
        return this.prisma.globalNotification.create({ data });
    }

    // Tìm theo ID
    async findById(id: string): Promise<IGlobalNotification | null> {
        return this.prisma.globalNotification.findFirst({
            where: { id, is_deleted: false },
        });
    }

    // Lấy danh sách với phân trang
    async findMany(query: QueryGlobalNotificationDto): Promise<IPaginatedResponse<IGlobalNotification>> {
        const limit = query.limit ?? this.paginationConfig.defaultLimit;
        const offset = query.offset ?? this.paginationConfig.defaultOffset;

        const where: Prisma.GlobalNotificationWhereInput = {
            is_deleted: false,
        };

        if (query.keywords) {
            where.OR = [
                { title: { contains: query.keywords, mode: 'insensitive' } },
                { content: { contains: query.keywords, mode: 'insensitive' } },
            ];
        }

        if (query.is_active !== undefined) {
            where.is_active = query.is_active;
        }

        if (query.type) {
            where.type = query.type;
        }

        const [data, total] = await Promise.all([
            this.prisma.globalNotification.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.globalNotification.count({ where }),
        ]);

        return {
            data,
            total,
            limit,
            offset,
            hasMore: offset + data.length < total,
        };
    }

    // Lấy danh sách active (cho public)
    async findActiveNotifications(): Promise<IGlobalNotification[]> {
        const now = new Date();
        return this.prisma.globalNotification.findMany({
            where: {
                is_deleted: false,
                is_active: true,
                OR: [
                    { starts_at: null },
                    { starts_at: { lte: now } },
                ],
                AND: [
                    {
                        OR: [
                            { ends_at: null },
                            { ends_at: { gte: now } },
                        ],
                    },
                ],
            },
            orderBy: { created_at: 'desc' },
        });
    }

    // Cập nhật GlobalNotification
    async update(id: string, data: Prisma.GlobalNotificationUpdateInput): Promise<IGlobalNotification> {
        return this.prisma.globalNotification.update({
            where: { id },
            data,
        });
    }

    // Xóa mềm GlobalNotification
    async softDelete(id: string, deletedBy: string): Promise<IGlobalNotification> {
        return this.prisma.globalNotification.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: deletedBy,
            },
        });
    }
}
