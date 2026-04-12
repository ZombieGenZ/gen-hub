import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { CouponRepository } from './repositories/coupon.repository';
import { CouponCacheKeys } from './constants/coupon-cache-keys.helper';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateCouponDto, UpdateCouponDto, QueryCouponDto } from './dto';

@Injectable()
export class CouponService {
  constructor(
    private readonly repository: CouponRepository,
    private readonly cacheKeys: CouponCacheKeys,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  async create(dto: CreateCouponDto, userId: string, lang: string) {
    // Kiểm tra mã code trùng với thời gian hiệu lực chồng chéo
    const existingCode = await this.repository.findByCodeWithOverlap(
      dto.code,
      dto.starts_at,
      dto.ends_at,
    );
    if (existingCode) {
      throw new ConflictException(
        this.i18n.t('coupon.errors.code_exists_with_overlap', { lang }),
      );
    }

    const {
      target_user_ids,
      target_warehouse_ids,
      target_row_ids,
      target_addon_ids,
      target_insurance_ids,
      gift_addon_ids,
      gift_insurance_ids,
      ...couponData
    } = dto;

    const data: any = {
      ...couponData,
      created_by: userId,
    };

    // Handle relations
    if (dto.coupon_type === 'PRIVATE' && target_user_ids?.length) {
      data.target_users = {
        create: target_user_ids.map((id) => ({ user_id: id })),
      };
    }

    if (
      dto.apply_for_all_warehouses === false &&
      target_warehouse_ids?.length
    ) {
      data.target_warehouses = {
        create: target_warehouse_ids.map((id) => ({
          warehouse_template_id: id,
        })),
      };
    }

    if (dto.apply_for_all_rows === false && target_row_ids?.length) {
      data.target_rows = {
        create: target_row_ids.map((id) => ({ row_template_id: id })),
      };
    }

    if (dto.apply_for_all_addons === false && target_addon_ids?.length) {
      data.target_addons = {
        create: target_addon_ids.map((id) => ({ addon_id: id })),
      };
    }

    if (
      dto.apply_for_all_insurances === false &&
      target_insurance_ids?.length
    ) {
      data.target_insurances = {
        create: target_insurance_ids.map((id) => ({ insurance_id: id })),
      };
    }

    const coupon = await this.repository.create(data);

    // Handle gift addons
    if (dto.has_gift_addons && gift_addon_ids?.length) {
      await this.repository.createGiftAddons(coupon.id, gift_addon_ids);
    }

    // Handle gift insurances
    if (dto.has_gift_insurances && gift_insurance_ids?.length) {
      await this.repository.createGiftInsurances(coupon.id, gift_insurance_ids);
    }

    // Xóa cache list
    await this.invalidateListCache();

    // Ghi log
    this.systemLogService.info(
      'Coupon',
      'CREATE',
      `Tạo coupon mới: ${coupon.name}`,
      {
        userId,
        metaData: { couponId: coupon.id, name: coupon.name, code: coupon.code },
      },
    );

    // Emit socket event
    this.websocketGateway.server.emit('coupon:created', {
      couponId: coupon.id,
      name: coupon.name,
      code: coupon.code,
      createdBy: userId,
      timestamp: new Date().toISOString(),
    });

    return coupon;
  }

  async findAll(
    query: QueryCouponDto,
    userId: string,
    hasListAll: boolean = false,
  ) {
    const { limit = 10, offset = 0, keywords, is_active, is_public } = query;

    // Check cache - Cache-Aside Pattern
    // Cache key cần bao gồm scope (all hoặc userId) để tránh leak data
    const cacheFilters = { ...query, scope: hasListAll ? 'all' : userId };
    const cacheKey = this.cacheKeys.list(cacheFilters);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const where: any = { is_deleted: false };

    // Nếu không có quyền list.all, chỉ lấy coupon do chính mình tạo
    if (!hasListAll) {
      where.created_by = userId;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (is_public !== undefined) {
      where.is_public = is_public;
    }

    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { description: { contains: keywords, mode: 'insensitive' } },
        { code: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    // Parallel execution for better performance
    const [data, total] = await Promise.all([
      this.repository.findAll({
        skip: offset,
        take: limit,
        where,
        orderBy: { created_at: 'desc' },
      }),
      this.repository.count(where),
    ]);

    const hasMore = offset + data.length < total;
    const result = { items: data, total, limit, offset, hasMore };

    // Set cache with TTL from environment
    const ttl = this.cacheKeys.getTTL('list');
    await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

    return result;
  }

  async findById(
    id: string,
    userId: string,
    hasReadAll: boolean = false,
    lang: string,
  ) {
    // Check cache - Cache-Aside Pattern
    const cacheKey = this.cacheKeys.item(id);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      const coupon = JSON.parse(cached);
      // Check ownership logic (kể cả khi lấy từ cache)
      if (!hasReadAll && coupon.created_by !== userId) {
        // Nếu coupon là public, có thể cho phép read không?
        // Logic hiện tại: *.read permission (ownership flow).
        // Nếu muốn public access -> logic khác hoặc permission khác.
        // Ở đây tuân thủ strict ownership nếu không có quyền .all
        throw new ForbiddenException(
          this.i18n.t('coupon.errors.forbidden', { lang }),
        );
      }
      return coupon;
    }

    // Query database
    const coupon = await this.repository.findById(id);
    if (!coupon) {
      throw new NotFoundException(
        this.i18n.t('coupon.errors.not_found', { lang }),
      );
    }

    // Check ownership logic
    if (!hasReadAll && coupon.created_by !== userId) {
      throw new ForbiddenException(
        this.i18n.t('coupon.errors.forbidden', { lang }),
      );
    }

    // Set cache with TTL from environment
    const ttl = this.cacheKeys.getTTL('item');
    await this.redisService.set(cacheKey, JSON.stringify(coupon), ttl);

    return coupon;
  }

  async update(
    id: string,
    dto: UpdateCouponDto,
    userId: string,
    hasUpdateAll: boolean,
    lang: string,
  ) {
    const coupon = await this.repository.findById(id);
    if (!coupon) {
      throw new NotFoundException(
        this.i18n.t('coupon.errors.not_found', { lang }),
      );
    }

    // Check ownership
    if (!hasUpdateAll && coupon.created_by !== userId) {
      throw new ForbiddenException(
        this.i18n.t('coupon.errors.forbidden', { lang }),
      );
    }

    // Kiểm tra mã code trùng với thời gian hiệu lực chồng chéo nếu đang cập nhật code hoặc thời gian
    const newCode = dto.code ?? coupon.code;
    const newStartsAt = dto.starts_at ?? coupon.starts_at;
    const newEndsAt = dto.ends_at ?? coupon.ends_at;

    if (dto.code || dto.starts_at || dto.ends_at) {
      const existing = await this.repository.findByCodeWithOverlap(
        newCode,
        newStartsAt,
        newEndsAt,
        id,
      );
      if (existing) {
        throw new ConflictException(
          this.i18n.t('coupon.errors.code_exists_with_overlap', { lang }),
        );
      }
    }

    const {
      target_user_ids,
      target_warehouse_ids,
      target_row_ids,
      target_addon_ids,
      target_insurance_ids,
      gift_addon_ids,
      gift_insurance_ids,
      ...updateData
    } = dto;

    const data: any = {
      ...updateData,
      updated_by: userId,
    };

    // Handle relations update
    // Handle relations update
    // 1. Target Users
    const isPrivate = (dto.coupon_type ?? coupon.coupon_type) === 'PRIVATE';
    if (target_user_ids !== undefined || dto.coupon_type !== undefined) {
      if (isPrivate) {
        if (target_user_ids !== undefined) {
          data.target_users = {
            deleteMany: {},
            create: target_user_ids.map((id) => ({ user_id: id })),
          };
        }
      } else {
        data.target_users = { deleteMany: {} };
      }
    }

    // 2. Target Warehouses
    const applyAllWarehouses =
      dto.apply_for_all_warehouses ?? coupon.apply_for_all_warehouses;
    if (
      target_warehouse_ids !== undefined ||
      dto.apply_for_all_warehouses !== undefined
    ) {
      if (!applyAllWarehouses) {
        if (target_warehouse_ids !== undefined) {
          data.target_warehouses = {
            deleteMany: {},
            create: target_warehouse_ids.map((id) => ({
              warehouse_template_id: id,
            })),
          };
        }
      } else {
        data.target_warehouses = { deleteMany: {} };
      }
    }

    // 3. Target Rows
    const applyAllRows = dto.apply_for_all_rows ?? coupon.apply_for_all_rows;
    if (target_row_ids !== undefined || dto.apply_for_all_rows !== undefined) {
      if (!applyAllRows) {
        if (target_row_ids !== undefined) {
          data.target_rows = {
            deleteMany: {},
            create: target_row_ids.map((id) => ({ row_template_id: id })),
          };
        }
      } else {
        data.target_rows = { deleteMany: {} };
      }
    }

    // 4. Target Addons
    const applyAllAddons =
      dto.apply_for_all_addons ?? coupon.apply_for_all_addons;
    if (
      target_addon_ids !== undefined ||
      dto.apply_for_all_addons !== undefined
    ) {
      if (!applyAllAddons) {
        if (target_addon_ids !== undefined) {
          data.target_addons = {
            deleteMany: {},
            create: target_addon_ids.map((id) => ({ addon_id: id })),
          };
        }
      } else {
        data.target_addons = { deleteMany: {} };
      }
    }

    // 5. Target Insurances
    const applyAllInsurances =
      dto.apply_for_all_insurances ?? coupon.apply_for_all_insurances;
    if (
      target_insurance_ids !== undefined ||
      dto.apply_for_all_insurances !== undefined
    ) {
      if (!applyAllInsurances) {
        if (target_insurance_ids !== undefined) {
          data.target_insurances = {
            deleteMany: {},
            create: target_insurance_ids.map((id) => ({ insurance_id: id })),
          };
        }
      } else {
        data.target_insurances = { deleteMany: {} };
      }
    }

    const updated = await this.repository.update(id, data);

    // Handle gift addons update
    if (gift_addon_ids !== undefined) {
      await this.repository.deleteGiftAddons(id);
      if (dto.has_gift_addons && gift_addon_ids?.length) {
        await this.repository.createGiftAddons(id, gift_addon_ids);
      }
    }

    // Handle gift insurances update
    if (gift_insurance_ids !== undefined) {
      await this.repository.deleteGiftInsurances(id);
      if (dto.has_gift_insurances && gift_insurance_ids?.length) {
        await this.repository.createGiftInsurances(id, gift_insurance_ids);
      }
    }

    // Invalidate cache
    await Promise.all([this.invalidateCache(id), this.invalidateListCache()]);

    // Ghi log
    this.systemLogService.info(
      'Coupon',
      'UPDATE',
      `Cập nhật coupon: ${updated.name}`,
      {
        userId,
        metaData: { couponId: id, updatedFields: Object.keys(dto) },
      },
    );

    // Emit socket event
    this.websocketGateway.server.emit('coupon:updated', {
      couponId: id,
      name: updated.name,
      code: updated.code,
      updatedFields: Object.keys(dto),
      updatedBy: userId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async delete(
    id: string,
    userId: string,
    hasDeleteAll: boolean,
    lang: string,
  ) {
    const coupon = await this.repository.findById(id);
    if (!coupon) {
      throw new NotFoundException(
        this.i18n.t('coupon.errors.not_found', { lang }),
      );
    }

    // Check ownership
    if (!hasDeleteAll && coupon.created_by !== userId) {
      throw new ForbiddenException(
        this.i18n.t('coupon.errors.forbidden', { lang }),
      );
    }

    await this.repository.softDelete(id, userId);

    // Invalidate cache
    await Promise.all([this.invalidateCache(id), this.invalidateListCache()]);

    // Ghi log
    this.systemLogService.info(
      'Coupon',
      'DELETE',
      `Xóa coupon: ${coupon.name}`,
      {
        userId,
        metaData: { couponId: id, name: coupon.name, code: coupon.code },
      },
    );

    // Emit socket event
    this.websocketGateway.server.emit('coupon:deleted', {
      couponId: id,
      name: coupon.name,
      code: coupon.code,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  async deleteMany(
    ids: string[],
    userId: string,
    hasDeleteAll: boolean,
    lang: string,
  ) {
    const coupons = await this.repository.findByIds(ids);
    if (coupons.length === 0) {
      throw new NotFoundException(
        this.i18n.t('coupon.errors.not_found', { lang }),
      );
    }

    // Check ownership logic for ALL items
    if (!hasDeleteAll) {
      const hasNonOwned = coupons.some((c) => c.created_by !== userId);
      if (hasNonOwned) {
        throw new ForbiddenException(
          this.i18n.t('coupon.errors.forbidden', { lang }),
        );
      }
    }

    await this.repository.softDeleteMany(ids, userId);

    // Invalidate cache
    await Promise.all(ids.map((id) => this.invalidateCache(id)));
    await this.invalidateListCache();

    // Emit socket event
    this.websocketGateway.server.emit('coupon:deletedMany', {
      couponIds: ids,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    // Log
    coupons.forEach((c) => {
      this.systemLogService.info('Coupon', 'DELETE', `Xóa coupon: ${c.name}`, {
        userId,
        metaData: { couponId: c.id, name: c.name, code: c.code },
      });
    });
  }

  private async invalidateCache(id: string) {
    await this.redisService.del(this.cacheKeys.item(id));
  }

  private async invalidateListCache() {
    const listPrefix = this.cacheKeys.list();
    await this.redisService.delByPattern(`${listPrefix}*`);
  }

  async getCouponUsages(
    couponId: string,
    userId: string,
    hasReadAll: boolean,
    lang: string,
    skip = 0,
    take = 20,
  ) {
    const coupon = await this.repository.findById(couponId);
    if (!coupon) {
      throw new NotFoundException(
        this.i18n.t('coupon.errors.not_found', { lang }),
      );
    }

    if (!hasReadAll && coupon.created_by !== userId) {
      throw new ForbiddenException(
        this.i18n.t('coupon.errors.forbidden', { lang }),
      );
    }

    return this.repository.getCouponUsages(couponId, skip, take);
  }
}
