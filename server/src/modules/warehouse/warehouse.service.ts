import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';

import { WarehouseRepository } from './warehouse.repository';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  QueryWarehouseDto,
} from './dto';
import {
  IWarehouseWithRelations,
  IPaginatedResponse,
  IWarehouseLayout,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { OrganizationAuditLogService } from '../organization/organization-audit-log.service';
import { OrganizationRepository } from '../organization/organization.repository';

/**
 * Service xử lý business logic cho Warehouse
 */
@Injectable()
export class WarehouseService {
  private readonly WAREHOUSE_CACHE_TTL: number;
  private readonly WAREHOUSE_LIST_CACHE_TTL: number;

  constructor(
    private readonly repository: WarehouseRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly auditLogService: OrganizationAuditLogService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    this.WAREHOUSE_CACHE_TTL =
      this.configService.get<number>('REDIS_WAREHOUSE_CACHE_TTL') || 300;
    this.WAREHOUSE_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_WAREHOUSE_LIST_CACHE_TTL') || 60;
  }

  /**
   * Kiểm tra quyền organization.
   * Owner có full quyền, member cần có permission tương ứng.
   */
  private async checkOrgPermission(
    orgId: string,
    userId: string,
    permissionKey: string,
    lang: string,
  ): Promise<void> {
    // Lấy thông tin organization
    const org = await this.organizationRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException(
        await this.i18n.translate('organization.errors.not_found', { lang }),
      );
    }

    // Owner có full quyền (kiểm tra cả owner_id và owner.id để đảm bảo)
    if (userId === org.owner_id || userId === org.owner?.id) {
      return;
    }

    // Kiểm tra member và permission
    const member = await this.organizationRepository.findMemberByUserAndOrg(
      userId,
      orgId,
    );
    if (!member || !member.is_accepted) {
      throw new ForbiddenException(
        await this.i18n.translate('warehouse.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra direct permissions
    const hasDirectPermission = member.permissions?.some(
      (p) => p.permission.key === permissionKey,
    );
    if (hasDirectPermission) return;

    // Kiểm tra role permissions
    const hasRolePermission = member.roles?.some(
      (r) =>
        // TODO: implement full check when roles include permissions
        false,
    );

    if (!hasRolePermission && !hasDirectPermission) {
      throw new ForbiddenException(
        await this.i18n.translate('warehouse.errors.no_permission', { lang }),
      );
    }
  }

  /**
   * Lấy danh sách warehouse
   * Nếu có organizationId, kiểm tra quyền đọc trong org đó
   */
  async findMany(
    query: QueryWarehouseDto,
    userId: string,
    organizationId?: string,
    lang: string = 'vi',
  ): Promise<IPaginatedResponse<IWarehouseWithRelations>> {
    // Nếu có organizationId, kiểm tra quyền đọc
    if (organizationId) {
      await this.checkOrgPermission(
        organizationId,
        userId,
        'warehouse.list',
        lang,
      );
      // Ghi đè organization_id trong query
      query.organization_id = organizationId;
    }

    const queryParams: Record<string, unknown> = {
      limit: query.limit,
      offset: query.offset,
      keywords: query.keywords,
      is_active: query.is_active,
      organization_id: query.organization_id,
      userId, // Thêm userId vào cache key để phân biệt
    };
    const cacheKey = this.getWarehouseListCacheKey(queryParams);

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // Cache không hợp lệ
      }
    }

    const result = await this.repository.findMany(query);

    // Cache kết quả
    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.WAREHOUSE_LIST_CACHE_TTL,
    );

    return result;
  }

  /**
   * Lấy chi tiết warehouse
   * Kiểm tra quyền: phải là owner/member của org đó hoặc có permission
   */
  async findById(
    id: string,
    userId: string,
    organizationId?: string,
    lang: string = 'vi',
  ): Promise<IWarehouseWithRelations> {
    const cacheKey = this.getWarehouseCacheKey(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      try {
        const warehouse = JSON.parse(cached) as IWarehouseWithRelations;
        // Kiểm tra quyền truy cập
        if (organizationId && warehouse.organization_id !== organizationId) {
          throw new ForbiddenException(
            await this.i18n.translate('warehouse.errors.no_permission', {
              lang,
            }),
          );
        }
        if (organizationId) {
          await this.checkOrgPermission(
            warehouse.organization_id,
            userId,
            'warehouse.read',
            lang,
          );
        }
        return warehouse;
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        // Cache không hợp lệ
      }
    }

    const warehouse = await this.repository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(
        this.i18n.t('warehouse.errors.not_found', { lang }),
      );
    }

    // Kiểm tra quyền truy cập
    if (organizationId && warehouse.organization_id !== organizationId) {
      throw new ForbiddenException(
        await this.i18n.translate('warehouse.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra user có phải owner/member của org không (nếu có organizationId header)
    if (organizationId) {
      await this.checkOrgPermission(
        warehouse.organization_id,
        userId,
        'warehouse.read',
        lang,
      );
    }

    await this.redisService.set(
      cacheKey,
      JSON.stringify(warehouse),
      this.WAREHOUSE_CACHE_TTL,
    );

    return warehouse;
  }

  /**
   * Cập nhật warehouse (chỉ name/description)
   */
  async update(
    id: string,
    dto: UpdateWarehouseDto,
    userId: string,
    organizationId: string,
    lang: string,
  ): Promise<IWarehouseWithRelations> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(
        this.i18n.t('warehouse.errors.not_found', { lang }),
      );
    }

    // Kiểm tra quyền (phải thuộc organization)
    if (existing.organization_id !== organizationId) {
      throw new ForbiddenException(
        this.i18n.t('warehouse.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra quyền cấp org: owner có full quyền, member cần permission
    await this.checkOrgPermission(
      organizationId,
      userId,
      'warehouse.update',
      lang,
    );

    const updatedFields = Object.keys(dto);
    const oldData = { name: existing.name, description: existing.description };

    const warehouse = await this.repository.update(id, {
      ...dto,
      updated_by: userId,
    });

    // Invalidate caches
    await Promise.all([
      this.invalidateWarehouseCache(id),
      this.invalidateWarehouseListCache(),
    ]);

    // Log
    this.systemLogService.info(
      'warehouse',
      'update',
      `Updated warehouse: ${warehouse.name}`,
      {
        userId,
        metaData: { warehouseId: id, updatedFields },
      },
    );

    // Audit log
    this.auditLogService.logUpdate(
      organizationId,
      'warehouse',
      id,
      oldData as Record<string, unknown>,
      dto as Record<string, unknown>,
      { userId, description: `Updated warehouse: ${warehouse.name}` },
    );

    // Emit socket event
    this.websocketGateway.emitWarehouseUpdated(organizationId, id, warehouse.name || '', updatedFields, userId);

    return warehouse;
  }

  /**
   * Lấy layout warehouse
   * Kiểm tra quyền nếu có organizationId
   */
  async getLayout(
    id: string,
    userId: string,
    organizationId?: string,
    lang: string = 'vi',
  ): Promise<IWarehouseLayout> {
    const warehouse = await this.repository.findById(id);
    if (!warehouse) {
      throw new NotFoundException(
        this.i18n.t('warehouse.errors.not_found', { lang }),
      );
    }

    // Kiểm tra quyền truy cập
    if (organizationId && warehouse.organization_id !== organizationId) {
      throw new ForbiddenException(
        await this.i18n.translate('warehouse.errors.no_permission', { lang }),
      );
    }

    // Kiểm tra user có phải owner/member của org không (nếu có organizationId)
    if (organizationId) {
      await this.checkOrgPermission(
        warehouse.organization_id,
        userId,
        'warehouse.layout.view',
        lang,
      );
    }

    const layout = await this.repository.getLayout(id);
    if (!layout) {
      throw new NotFoundException(
        this.i18n.t('warehouse.errors.not_found', { lang }),
      );
    }
    return layout;
  }

  // Private helper methods
  private getWarehouseCacheKey(id: string): string {
    return `warehouse:${id}`;
  }

  private getWarehouseListCacheKey(query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `warehouse:list:${sortedParams}`;
  }

  private async invalidateWarehouseCache(id: string): Promise<void> {
    await this.redisService.del(this.getWarehouseCacheKey(id));
  }

  private async invalidateWarehouseListCache(): Promise<void> {
    await this.redisService.delByPattern('warehouse:list:*');
  }
}
