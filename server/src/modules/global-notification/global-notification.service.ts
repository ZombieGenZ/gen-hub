import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { GlobalNotificationRepository } from './global-notification.repository';
import {
  CreateGlobalNotificationDto,
  UpdateGlobalNotificationDto,
  QueryGlobalNotificationDto,
} from './dto';
import { IGlobalNotification, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';

/**
 * Service xử lý business logic cho GlobalNotification
 */
@Injectable()
export class GlobalNotificationService {
  constructor(
    private readonly repository: GlobalNotificationRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly i18n: I18nService,
  ) {}

  // Tạo mới GlobalNotification
  async create(
    dto: CreateGlobalNotificationDto,
    userId: string,
    lang: string,
  ): Promise<IGlobalNotification> {
    const notification = await this.repository.create({
      title: dto.title,
      content: dto.content,
      type: dto.type || 'INFO',
      starts_at: dto.starts_at ? new Date(dto.starts_at) : null,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : null,
      is_active: dto.is_active ?? true,
      created_by: userId,
    });

    // Invalidate cache
    await this.redisService.invalidateGlobalNotificationListCache();

    // Emit realtime event
    this.websocketGateway.emitGlobalNotificationCreated(
      notification.id,
      notification.title,
      userId,
    );

    // Log
    await this.systemLogService.log({
      level: 'INFO',
      module: 'GlobalNotification',
      action: 'CREATE',
      message: `Created global notification: ${notification.title}`,
      userId,
      metaData: { notificationId: notification.id },
    });

    return notification;
  }

  // Lấy danh sách GlobalNotification
  async findMany(
    query: QueryGlobalNotificationDto,
  ): Promise<IPaginatedResponse<IGlobalNotification>> {
    const cacheKey = this.redisService.getGlobalNotificationListCacheKey(
      query as Record<string, unknown>,
    );

    // Check cache
    // const cached = await this.redisService.getGlobalNotificationListCache<IPaginatedResponse<IGlobalNotification>>(cacheKey);
    // if (cached) {
    //     return cached;
    // }

    const result = await this.repository.findMany(query);

    // Set cache
    await this.redisService.setGlobalNotificationListCache(cacheKey, result);

    return result;
  }

  // Lấy chi tiết GlobalNotification theo ID
  async findById(id: string, lang: string): Promise<IGlobalNotification> {
    // Check cache
    const cached =
      await this.redisService.getGlobalNotificationCache<IGlobalNotification>(
        id,
      );
    if (cached) {
      return cached;
    }

    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundException(
        this.i18n.t('global-notification.errors.not_found', { lang }),
      );
    }

    // Set cache
    await this.redisService.setGlobalNotificationCache(id, notification);

    return notification;
  }

  // Cập nhật GlobalNotification
  async update(
    id: string,
    dto: UpdateGlobalNotificationDto,
    userId: string,
    lang: string,
  ): Promise<IGlobalNotification> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('global-notification.errors.not_found', { lang }),
      );
    }

    const notification = await this.repository.update(id, {
      ...dto,
      starts_at: dto.starts_at ? new Date(dto.starts_at) : undefined,
      ends_at: dto.ends_at ? new Date(dto.ends_at) : undefined,
      updated_by: userId,
    });

    // Invalidate cache
    await this.redisService.invalidateGlobalNotificationCache(id);
    await this.redisService.invalidateGlobalNotificationListCache();

    // Emit realtime event
    this.websocketGateway.emitGlobalNotificationUpdated(
      notification.id,
      notification.title,
      Object.keys(dto),
      userId,
    );

    // Log
    await this.systemLogService.log({
      level: 'INFO',
      module: 'GlobalNotification',
      action: 'UPDATE',
      message: `Updated global notification: ${notification.title}`,
      userId,
      metaData: {
        notificationId: notification.id,
        updatedFields: Object.keys(dto),
      },
    });

    return notification;
  }

  // Xóa GlobalNotification
  async delete(id: string, userId: string, lang: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('global-notification.errors.not_found', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);

    // Invalidate cache
    await this.redisService.invalidateGlobalNotificationCache(id);
    await this.redisService.invalidateGlobalNotificationListCache();

    // Emit realtime event
    this.websocketGateway.emitGlobalNotificationDeleted(
      id,
      existing.title,
      userId,
    );

    // Log
    await this.systemLogService.log({
      level: 'INFO',
      module: 'GlobalNotification',
      action: 'DELETE',
      message: `Deleted global notification: ${existing.title}`,
      userId,
      metaData: { notificationId: id },
    });
  }

  async deleteMany(ids: string[], userId: string, lang: string): Promise<void> {
    const notifications = await this.repository.findByIds(ids);
    if (notifications.length === 0) {
      throw new NotFoundException(
        this.i18n.t('global-notification.errors.not_found', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);

    // Invalidate cache
    await Promise.all(
      ids.map((id) => this.redisService.invalidateGlobalNotificationCache(id)),
    );
    await this.redisService.invalidateGlobalNotificationListCache();

    // Emit realtime event
    this.websocketGateway.server.emit('globalNotification:deletedMany', {
      ids,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Log
    notifications.forEach((notification) => {
      this.systemLogService.log({
        level: 'INFO',
        module: 'GlobalNotification',
        action: 'DELETE',
        message: `Deleted global notification: ${notification.title}`,
        userId,
        metaData: { notificationId: notification.id },
      });
    });
  }

  // Lấy danh sách thông báo đang active (public)
  async getActiveNotifications(): Promise<IGlobalNotification[]> {
    return this.repository.findActiveNotifications();
  }
}
