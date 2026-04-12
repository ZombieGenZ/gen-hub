import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OrgNotificationRepository } from './org-notification.repository';
import {
  CreateOrgNotificationDto,
  UpdateOrgNotificationDto,
  QueryOrgNotificationDto,
} from './dto';
import { IOrgNotification, IPaginatedResponse } from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';

/**
 * Service xử lý business logic cho OrganizationNotification
 */
@Injectable()
export class OrgNotificationService {
  constructor(
    private readonly repository: OrgNotificationRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly auditLogService: OrganizationAuditLogService,
    private readonly i18n: I18nService,
  ) {}

  // Tạo mới OrganizationNotification
  async create(
    orgId: string,
    dto: CreateOrgNotificationDto,
    userId: string,
    lang: string,
  ): Promise<IOrgNotification> {
    // Kiểm tra organization tồn tại
    const orgExists = await this.repository.orgExists(orgId);
    if (!orgExists) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.organization_not_found', { lang }),
      );
    }

    // Kiểm tra warehouse nếu có
    if (dto.warehouse_id) {
      const warehouseValid = await this.repository.warehouseBelongsToOrg(
        dto.warehouse_id,
        orgId,
      );
      if (!warehouseValid) {
        throw new BadRequestException(
          this.i18n.t('org-notification.errors.warehouse_not_found', { lang }),
        );
      }
    }

    const notification = await this.repository.create({
      title: dto.title,
      content: dto.content,
      type: dto.type || 'INFO',
      is_active: dto.is_active ?? true,
      organization: { connect: { id: orgId } },
      warehouse: dto.warehouse_id
        ? { connect: { id: dto.warehouse_id } }
        : undefined,
      created_by: userId,
    });

    // Invalidate cache
    await this.redisService.invalidateOrgNotificationListCache(orgId);

    // Emit realtime event
    this.websocketGateway.emitOrgNotificationCreated(
      orgId,
      notification.id,
      notification.title,
      userId,
    );

    // Audit log
    this.auditLogService.logCreate(
      orgId,
      'OrganizationNotification',
      notification.id,
      notification as unknown as Record<string, unknown>,
      {
        userId,
        description: `Created organization notification: ${notification.title}`,
      },
    );

    return notification;
  }

  // Lấy danh sách OrganizationNotification
  async findMany(
    orgId: string,
    query: QueryOrgNotificationDto,
    lang: string,
  ): Promise<IPaginatedResponse<IOrgNotification>> {
    // Kiểm tra organization tồn tại
    const orgExists = await this.repository.orgExists(orgId);
    if (!orgExists) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.organization_not_found', { lang }),
      );
    }

    const cacheKey = this.redisService.getOrgNotificationListCacheKey(
      orgId,
      query as Record<string, unknown>,
    );

    // Check cache
    const cached =
      await this.redisService.getOrgNotificationListCache<
        IPaginatedResponse<IOrgNotification>
      >(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.repository.findByOrgId(orgId, query);

    // Set cache
    await this.redisService.setOrgNotificationListCache(cacheKey, result);

    return result;
  }

  // Lấy chi tiết OrganizationNotification theo ID
  async findById(
    orgId: string,
    id: string,
    lang: string,
  ): Promise<IOrgNotification> {
    // Check cache
    const cached =
      await this.redisService.getOrgNotificationCache<IOrgNotification>(id);
    if (cached && cached.organization_id === orgId) {
      return cached;
    }

    const notification = await this.repository.findByIdAndOrgId(id, orgId);
    if (!notification) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.not_found', { lang }),
      );
    }

    // Set cache
    await this.redisService.setOrgNotificationCache(id, notification);

    return notification;
  }

  // Cập nhật OrganizationNotification
  async update(
    orgId: string,
    id: string,
    dto: UpdateOrgNotificationDto,
    userId: string,
    lang: string,
  ): Promise<IOrgNotification> {
    const existing = await this.repository.findByIdAndOrgId(id, orgId);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.not_found', { lang }),
      );
    }

    // Kiểm tra warehouse nếu có
    if (dto.warehouse_id) {
      const warehouseValid = await this.repository.warehouseBelongsToOrg(
        dto.warehouse_id,
        orgId,
      );
      if (!warehouseValid) {
        throw new BadRequestException(
          this.i18n.t('org-notification.errors.warehouse_not_found', { lang }),
        );
      }
    }

    const notification = await this.repository.update(id, {
      ...dto,
      warehouse: dto.warehouse_id
        ? { connect: { id: dto.warehouse_id } }
        : undefined,
      updated_by: userId,
    });

    // Invalidate cache
    await this.redisService.invalidateOrgNotificationCache(id);
    await this.redisService.invalidateOrgNotificationListCache(orgId);

    // Emit realtime event
    this.websocketGateway.emitOrgNotificationUpdated(
      orgId,
      notification.id,
      notification.title,
      Object.keys(dto),
      userId,
    );

    // Audit log
    this.auditLogService.logUpdate(
      orgId,
      'OrganizationNotification',
      notification.id,
      existing as unknown as Record<string, unknown>,
      notification as unknown as Record<string, unknown>,
      {
        userId,
        description: `Updated organization notification: ${notification.title}`,
      },
    );

    return notification;
  }

  // Xóa OrganizationNotification
  async delete(
    orgId: string,
    id: string,
    userId: string,
    lang: string,
  ): Promise<void> {
    const existing = await this.repository.findByIdAndOrgId(id, orgId);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.not_found', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);

    // Invalidate cache
    await this.redisService.invalidateOrgNotificationCache(id);
    await this.redisService.invalidateOrgNotificationListCache(orgId);

    // Emit realtime event
    this.websocketGateway.emitOrgNotificationDeleted(
      orgId,
      id,
      existing.title,
      userId,
    );

    // Audit log
    this.auditLogService.logDelete(
      orgId,
      'OrganizationNotification',
      id,
      existing as unknown as Record<string, unknown>,
      {
        userId,
        description: `Deleted organization notification: ${existing.title}`,
      },
    );
  }

  async deleteMany(
    orgId: string,
    ids: string[],
    userId: string,
    lang: string,
  ): Promise<void> {
    const notifications = await this.repository.findByIds(ids);
    if (notifications.length === 0) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.not_found', { lang }),
      );
    }

    const invalidNotif = notifications.find((n) => n.organization_id !== orgId);
    if (invalidNotif) {
      throw new NotFoundException(
        this.i18n.t('org-notification.errors.not_found', { lang }),
      );
    }

    await this.repository.softDeleteMany(ids, userId);

    // Invalidate cache
    await Promise.all(
      ids.map((id) => this.redisService.invalidateOrgNotificationCache(id)),
    );
    await this.redisService.invalidateOrgNotificationListCache(orgId);

    // Emit realtime events
    this.websocketGateway.emitToOrganization(
      orgId,
      'orgNotification:deletedMany',
      {
        ids,
        actorId: userId,
      },
    );

    // Audit log
    notifications.forEach((n) => {
      this.auditLogService.logDelete(
        orgId,
        'OrganizationNotification',
        n.id,
        n as unknown as Record<string, unknown>,
        {
          userId,
          description: `Deleted organization notification: ${n.title}`,
        },
      );
    });
  }
}
