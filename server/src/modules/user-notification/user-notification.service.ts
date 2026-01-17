import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { UserNotificationRepository } from './user-notification.repository';
import { SendUserNotificationDto, QueryUserNotificationDto } from './dto';
import { IUserNotification, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';

/**
 * Service xử lý business logic cho UserNotification
 */
@Injectable()
export class UserNotificationService {
    constructor(
        private readonly repository: UserNotificationRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly i18n: I18nService,
    ) { }

    // Lấy danh sách thông báo của user hiện tại
    async getMyNotifications(
        userId: string,
        query: QueryUserNotificationDto,
    ): Promise<IPaginatedResponse<IUserNotification>> {
        const cacheKey = this.redisService.getUserNotificationListCacheKey(userId, query as Record<string, unknown>);

        // Check cache
        const cached = await this.redisService.getUserNotificationListCache<IPaginatedResponse<IUserNotification>>(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await this.repository.findByUserId(userId, query);

        // Set cache
        await this.redisService.setUserNotificationListCache(cacheKey, result);

        return result;
    }

    // Lấy danh sách thông báo theo user ID (admin only)
    async getNotificationsByUserId(
        targetUserId: string,
        query: QueryUserNotificationDto,
        lang: string,
    ): Promise<IPaginatedResponse<IUserNotification>> {
        // Kiểm tra user tồn tại
        const userExists = await this.repository.userExists(targetUserId);
        if (!userExists) {
            throw new NotFoundException(
                this.i18n.t('user-notification.errors.user_not_found', { lang }),
            );
        }

        // Check cache (sử dụng cùng cache key pattern như getMyNotifications)
        const cacheKey = this.redisService.getUserNotificationListCacheKey(targetUserId, query as Record<string, unknown>);
        const cached = await this.redisService.getUserNotificationListCache<IPaginatedResponse<IUserNotification>>(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await this.repository.findByUserId(targetUserId, query);

        // Set cache
        await this.redisService.setUserNotificationListCache(cacheKey, result);

        return result;
    }

    // Gửi thông báo cho user
    async sendNotification(
        dto: SendUserNotificationDto,
        senderId: string,
        lang: string,
    ): Promise<IUserNotification> {
        // Kiểm tra user tồn tại
        const userExists = await this.repository.userExists(dto.user_id);
        if (!userExists) {
            throw new NotFoundException(
                this.i18n.t('user-notification.errors.user_not_found', { lang }),
            );
        }

        const notification = await this.repository.create({
            title: dto.title,
            content: dto.content,
            type: dto.type || 'INFO',
            user: { connect: { id: dto.user_id } },
        });

        // Invalidate cache
        await this.redisService.invalidateUserNotificationListCache(dto.user_id);

        // Emit realtime event đến user nhận
        this.websocketGateway.emitUserNotificationReceived(dto.user_id, notification);

        // Log
        await this.systemLogService.log({
            level: 'INFO',
            module: 'UserNotification',
            action: 'SEND',
            message: `Sent notification to user: ${dto.user_id}`,
            userId: senderId,
            metaData: { notificationId: notification.id, targetUserId: dto.user_id },
        });

        return notification;
    }

    // Đánh dấu đã đọc
    async markAsRead(
        notificationId: string,
        userId: string,
        lang: string,
    ): Promise<IUserNotification> {
        const notification = await this.repository.findById(notificationId);
        if (!notification) {
            throw new NotFoundException(
                this.i18n.t('user-notification.errors.not_found', { lang }),
            );
        }

        // Kiểm tra quyền sở hữu
        if (notification.user_id !== userId) {
            throw new ForbiddenException(
                this.i18n.t('user-notification.errors.not_owner', { lang }),
            );
        }

        const updated = await this.repository.markAsRead(notificationId);

        // Invalidate cache
        await this.redisService.invalidateUserNotificationListCache(userId);

        // Emit realtime event
        this.websocketGateway.emitUserNotificationRead(userId, notificationId);

        return updated;
    }

    // Đánh dấu tất cả đã đọc
    async markAllAsRead(userId: string): Promise<{ count: number }> {
        const result = await this.repository.markAllAsRead(userId);

        // Invalidate cache
        await this.redisService.invalidateUserNotificationListCache(userId);

        // Emit realtime event
        this.websocketGateway.emitUserNotificationAllRead(userId);

        return result;
    }

    // Đếm số thông báo chưa đọc
    async countUnread(userId: string): Promise<number> {
        return this.repository.countUnread(userId);
    }

    // Gửi thông báo cho nhiều users
    async sendBulkNotification(
        dto: { user_ids: string[]; title: string; content: string; type?: string },
        senderId: string,
        lang: string,
    ): Promise<{ count: number }> {
        // Kiểm tra users tồn tại
        const existingUserIds = await this.repository.getExistingUserIds(dto.user_ids);
        const notFoundCount = dto.user_ids.length - existingUserIds.length;

        if (notFoundCount > 0) {
            throw new NotFoundException(
                this.i18n.t('user-notification.errors.some_users_not_found', {
                    lang,
                    args: { count: notFoundCount }
                }),
            );
        }

        // Tạo notifications
        const createDataList = dto.user_ids.map((userId) => ({
            title: dto.title,
            content: dto.content,
            type: (dto.type as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR') || 'INFO',
            user: { connect: { id: userId } },
        }));

        const notifications = await this.repository.createMany(createDataList);

        // Invalidate cache cho tất cả users
        await Promise.all(
            dto.user_ids.map((userId) =>
                this.redisService.invalidateUserNotificationListCache(userId),
            ),
        );

        // Emit realtime events
        notifications.forEach((notification) => {
            this.websocketGateway.emitUserNotificationReceived(
                notification.user_id,
                notification,
            );
        });

        // Log
        await this.systemLogService.log({
            level: 'INFO',
            module: 'UserNotification',
            action: 'SEND_BULK',
            message: `Sent bulk notification to ${dto.user_ids.length} users`,
            userId: senderId,
            metaData: { userCount: dto.user_ids.length },
        });

        return { count: notifications.length };
    }
}
