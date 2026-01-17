import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryUserNotificationDto } from './dto';
import { IUserNotification, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho UserNotification
 */
@Injectable()
export class UserNotificationRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly paginationConfig: PaginationConfigService,
    ) { }

    // Tạo mới UserNotification
    async create(data: Prisma.UserNotificationCreateInput): Promise<IUserNotification> {
        return this.prisma.userNotification.create({ data });
    }

    // Tìm theo ID
    async findById(id: string): Promise<IUserNotification | null> {
        return this.prisma.userNotification.findFirst({
            where: { id, is_deleted: false },
        });
    }

    // Lấy danh sách theo user với phân trang
    async findByUserId(
        userId: string,
        query: QueryUserNotificationDto,
    ): Promise<IPaginatedResponse<IUserNotification>> {
        const limit = this.paginationConfig.getLimit(query.limit);
        const offset = this.paginationConfig.getOffset(query.offset);

        const where: Prisma.UserNotificationWhereInput = {
            user_id: userId,
            is_deleted: false,
        };

        if (query.keywords) {
            where.OR = [
                { title: { contains: query.keywords, mode: 'insensitive' } },
                { content: { contains: query.keywords, mode: 'insensitive' } },
            ];
        }

        if (query.is_read !== undefined) {
            where.is_read = query.is_read;
        }

        if (query.type) {
            where.type = query.type;
        }

        const [items, total] = await Promise.all([
            this.prisma.userNotification.findMany({
                where,
                orderBy: { created_at: 'desc' },
                skip: offset,
                take: limit,
            }),
            this.prisma.userNotification.count({ where }),
        ]);

        return {
            items,
            total,
            limit,
            offset,
            hasMore: offset + items.length < total,
        };
    }

    // Đánh dấu đã đọc
    async markAsRead(id: string): Promise<IUserNotification> {
        return this.prisma.userNotification.update({
            where: { id },
            data: {
                is_read: true,
                read_at: new Date(),
            },
        });
    }

    // Đánh dấu tất cả đã đọc theo user
    async markAllAsRead(userId: string): Promise<{ count: number }> {
        return this.prisma.userNotification.updateMany({
            where: {
                user_id: userId,
                is_read: false,
                is_deleted: false,
            },
            data: {
                is_read: true,
                read_at: new Date(),
            },
        });
    }

    // Đếm số thông báo chưa đọc
    async countUnread(userId: string): Promise<number> {
        return this.prisma.userNotification.count({
            where: {
                user_id: userId,
                is_read: false,
                is_deleted: false,
            },
        });
    }

    // Kiểm tra user tồn tại
    async userExists(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        return !!user;
    }

    // Lấy danh sách user IDs tồn tại từ danh sách đầu vào
    async getExistingUserIds(userIds: string[]): Promise<string[]> {
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true },
        });
        return users.map((u) => u.id);
    }

    // Tạo nhiều notifications
    async createMany(
        dataList: Prisma.UserNotificationCreateInput[],
    ): Promise<IUserNotification[]> {
        // Prisma không hỗ trợ createMany với return data, phải dùng transaction
        const notifications = await this.prisma.$transaction(
            dataList.map((data) =>
                this.prisma.userNotification.create({ data }),
            ),
        );
        return notifications;
    }
}
