import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { CouponRepository } from './coupon.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateCouponDto, UpdateCouponDto, QueryCouponDto } from './dto';

@Injectable()
export class CouponService {
    private readonly cacheTTL: number;
    private readonly listCacheTTL: number;

    constructor(
        private readonly repository: CouponRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.cacheTTL = this.configService.get<number>('REDIS_COUPON_CACHE_TTL', 300);
        this.listCacheTTL = this.configService.get<number>('REDIS_COUPON_LIST_CACHE_TTL', 60);
    }

    private getCacheKey(id: string): string {
        return `coupon:${id}`;
    }

    private getListCacheKey(query: QueryCouponDto): string {
        return `coupon:list:${JSON.stringify(query)}`;
    }

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
                create: target_user_ids.map(id => ({ user_id: id })),
            };
        }

        if (dto.apply_for_all_warehouses === false && target_warehouse_ids?.length) {
            data.target_warehouses = {
                create: target_warehouse_ids.map(id => ({ warehouse_template_id: id })),
            };
        }

        if (dto.apply_for_all_rows === false && target_row_ids?.length) {
            data.target_rows = {
                create: target_row_ids.map(id => ({ row_template_id: id })),
            };
        }

        if (dto.apply_for_all_addons === false && target_addon_ids?.length) {
            data.target_addons = {
                create: target_addon_ids.map(id => ({ addon_id: id })),
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
        this.systemLogService.info('Coupon', 'CREATE', `Tạo coupon mới: ${coupon.name}`, {
            userId,
            metaData: { couponId: coupon.id, name: coupon.name, code: coupon.code },
        });


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

    async findAll(query: QueryCouponDto) {
        const { limit = 10, offset = 0, keywords, is_active, is_public } = query;

        // Check cache
        const cacheKey = this.getListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = { is_deleted: false };

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

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async findById(id: string, lang: string) {
        // Check cache
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const coupon = await this.repository.findById(id);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        // Set cache
        await this.redisService.set(cacheKey, JSON.stringify(coupon), this.cacheTTL);

        return coupon;
    }

    async update(id: string, dto: UpdateCouponDto, userId: string, lang: string) {
        const coupon = await this.repository.findById(id);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
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
            gift_addon_ids,
            gift_insurance_ids,
            ...updateData
        } = dto;

        const data: any = {
            ...updateData,
            updated_by: userId,
        };

        // Handle relations update
        if (target_user_ids !== undefined) {
            data.target_users = {
                deleteMany: {},
                create: target_user_ids?.map(id => ({ user_id: id })) || [],
            };
        }

        if (target_warehouse_ids !== undefined) {
            data.target_warehouses = {
                deleteMany: {},
                create: target_warehouse_ids?.map(id => ({ warehouse_template_id: id })) || [],
            };
        }

        if (target_row_ids !== undefined) {
            data.target_rows = {
                deleteMany: {},
                create: target_row_ids?.map(id => ({ row_template_id: id })) || [],
            };
        }

        if (target_addon_ids !== undefined) {
            data.target_addons = {
                deleteMany: {},
                create: target_addon_ids?.map(id => ({ addon_id: id })) || [],
            };
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

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Coupon', 'UPDATE', `Cập nhật coupon: ${updated.name}`, {
            userId,
            metaData: { couponId: id, updatedFields: Object.keys(dto) },
        });


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

    async delete(id: string, userId: string, lang: string) {
        const coupon = await this.repository.findById(id);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Xóa cache
        await this.invalidateCache(id);
        await this.invalidateListCache();

        // Ghi log
        this.systemLogService.info('Coupon', 'DELETE', `Xóa coupon: ${coupon.name}`, {
            userId,
            metaData: { couponId: id, name: coupon.name, code: coupon.code },
        });

        // Emit socket event
        this.websocketGateway.server.emit('coupon:deleted', {
            couponId: id,
            name: coupon.name,
            code: coupon.code,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });
    }

    async deleteMany(ids: string[], userId: string, lang: string) {
        const coupons = await this.repository.findByIds(ids);
        if (coupons.length === 0) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all(ids.map(id => this.invalidateCache(id)));
        await this.invalidateListCache();

        // Emit socket event
        this.websocketGateway.server.emit('coupon:deletedMany', {
            couponIds: ids,
            deletedBy: userId,
            timestamp: new Date().toISOString(),
        });

        // Log
        coupons.forEach(c => {
            this.systemLogService.info('Coupon', 'DELETE', `Xóa coupon: ${c.name}`, {
                userId,
                metaData: { couponId: c.id, name: c.name, code: c.code },
            });
        });
    }

    // Public APIs
    async findAllPublic(query: QueryCouponDto) {
        const { limit = 10, offset = 0, keywords } = query;

        const cacheKey = `coupon:public:${JSON.stringify({ limit, offset, keywords })}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        const where: any = {
            is_deleted: false,
            is_active: true,
            is_public: true,
        };

        if (keywords) {
            where.OR = [
                { name: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
            ];
        }

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
        await this.redisService.set(cacheKey, JSON.stringify(result), this.listCacheTTL);

        return result;
    }

    async saveCoupon(userId: string, couponId: string, lang: string) {
        const coupon = await this.repository.findById(couponId);
        if (!coupon) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_found', { lang }),
            );
        }

        const existing = await this.repository.findSavedCouponByUser(userId, couponId);
        if (existing) {
            throw new ConflictException(
                this.i18n.t('coupon.errors.already_saved', { lang }),
            );
        }

        await this.repository.saveCouponForUser(userId, couponId, userId);
    }

    async unsaveCoupon(userId: string, couponId: string, lang: string) {
        const existing = await this.repository.findSavedCouponByUser(userId, couponId);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_saved', { lang }),
            );
        }

        await this.repository.unsaveCouponForUser(userId, couponId, userId);
    }

    async getSavedCoupons(userId: string, query: QueryCouponDto) {
        const { limit = 10, offset = 0 } = query;

        const [data, total] = await Promise.all([
            this.repository.getSavedCoupons(userId, offset, limit),
            this.repository.countSavedCoupons(userId),
        ]);

        const hasMore = offset + data.length < total;
        return {
            items: data.map(item => item.coupon),
            total,
            limit,
            offset,
            hasMore,
        };
    }

    /**
     * Lấy danh sách coupon có thể áp dụng cho đơn hàng
     */
    async getApplicableCoupons(
        userId: string,
        dto: {
            addon_ids?: string[];
            warehouse_template_ids?: string[];
            row_template_ids?: string[];
            rental_duration_tier_id: string;
            type: 'NEW_CONTRACT' | 'RENEWAL';
        },
        lang: string,
    ) {
        // Lấy tất cả coupon đã lưu còn hiệu lực
        const savedCoupons = await this.repository.findApplicableSavedCoupons(userId);

        // Lọc coupon có thể áp dụng
        const applicableCoupons: any[] = [];

        for (const saved of savedCoupons) {
            const coupon = saved.coupon;
            const validation = await this.validateCouponApplicability(
                coupon,
                userId,
                dto,
                lang,
            );

            if (validation.isValid) {
                applicableCoupons.push({
                    ...coupon,
                    discount_info: validation.discountInfo,
                });
            }
        }

        return {
            items: applicableCoupons,
            total: applicableCoupons.length,
        };
    }

    /**
     * Validate coupon code có thể áp dụng cho đơn hàng
     */
    async validateCoupon(
        userId: string,
        dto: {
            code: string;
            addon_ids?: string[];
            warehouse_template_ids?: string[];
            row_template_ids?: string[];
            rental_duration_tier_id: string;
            type: 'NEW_CONTRACT' | 'RENEWAL';
        },
        lang: string,
    ) {
        // Tìm coupon theo code
        const coupon = await this.repository.findCouponByCodeActive(dto.code);

        if (!coupon) {
            return {
                isValid: false,
                error: this.i18n.t('coupon.errors.invalid_code', { lang }),
            };
        }

        // Kiểm tra giới hạn sử dụng
        if (coupon.max_usage > 0 && coupon.current_usage >= coupon.max_usage) {
            return {
                isValid: false,
                error: this.i18n.t('coupon.errors.usage_limit_reached', { lang }),
            };
        }

        // Validate các điều kiện
        const validation = await this.validateCouponApplicability(
            coupon,
            userId,
            dto,
            lang,
        );

        if (!validation.isValid) {
            return validation;
        }

        return {
            isValid: true,
            coupon: {
                id: coupon.id,
                name: coupon.name,
                code: coupon.code,
                description: coupon.description,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
            },
            discount_info: validation.discountInfo,
            message: this.i18n.t('coupon.success.coupon_valid', { lang }),
        };
    }

    /**
     * Validate coupon có thể áp dụng cho đơn hàng
     */
    private async validateCouponApplicability(
        coupon: any,
        userId: string,
        dto: {
            addon_ids?: string[];
            warehouse_template_ids?: string[];
            row_template_ids?: string[];
            rental_duration_tier_id: string;
            type: 'NEW_CONTRACT' | 'RENEWAL';
        },
        lang: string,
    ): Promise<{ isValid: boolean; error?: string; discountInfo?: any }> {
        const warehouseCount = dto.warehouse_template_ids?.length || 0;
        const rowCount = dto.row_template_ids?.length || 0;

        // Kiểm tra loại giao dịch
        if (dto.type === 'NEW_CONTRACT' && !coupon.apply_for_first_rental) {
            return {
                isValid: false,
                error: this.i18n.t('coupon.errors.not_for_new_contract', { lang }),
            };
        }

        if (dto.type === 'RENEWAL' && !coupon.apply_for_renewal) {
            return {
                isValid: false,
                error: this.i18n.t('coupon.errors.not_for_renewal', { lang }),
            };
        }

        // Kiểm tra điều kiện số kho tối thiểu
        if (coupon.require_min_warehouses && coupon.min_warehouses) {
            if (warehouseCount < coupon.min_warehouses) {
                return {
                    isValid: false,
                    error: this.i18n.t('coupon.errors.min_warehouses_not_met', { lang }),
                };
            }
        }

        // Kiểm tra điều kiện số row tối thiểu
        if (coupon.require_min_rows && coupon.min_rows) {
            if (rowCount < coupon.min_rows) {
                return {
                    isValid: false,
                    error: this.i18n.t('coupon.errors.min_rows_not_met', { lang }),
                };
            }
        }

        // Kiểm tra coupon PRIVATE - có target cho user không
        if (coupon.coupon_type === 'PRIVATE') {
            const targetUsers = coupon.target_users || [];
            const isTargeted = targetUsers.some((t: any) => t.user_id === userId);
            if (!isTargeted) {
                return {
                    isValid: false,
                    error: this.i18n.t('coupon.errors.user_not_targeted', { lang }),
                };
            }
        }

        // Kiểm tra target warehouse
        if (!coupon.apply_for_all_warehouses && dto.warehouse_template_ids?.length) {
            const targetWarehouses = coupon.target_warehouses || [];
            const targetWarehouseIds = targetWarehouses.map((t: any) => t.warehouse_template_id);
            const allMatched = dto.warehouse_template_ids.every(id => targetWarehouseIds.includes(id));
            if (!allMatched) {
                return {
                    isValid: false,
                    error: this.i18n.t('coupon.errors.warehouse_not_applicable', { lang }),
                };
            }
        }

        // Kiểm tra target row
        if (!coupon.apply_for_all_rows && dto.row_template_ids?.length) {
            const targetRows = coupon.target_rows || [];
            const targetRowIds = targetRows.map((t: any) => t.row_template_id);
            const allMatched = dto.row_template_ids.every(id => targetRowIds.includes(id));
            if (!allMatched) {
                return {
                    isValid: false,
                    error: this.i18n.t('coupon.errors.row_not_applicable', { lang }),
                };
            }
        }

        // Kiểm tra target addon
        if (!coupon.apply_for_all_addons && dto.addon_ids?.length) {
            const targetAddons = coupon.target_addons || [];
            const targetAddonIds = targetAddons.map((t: any) => t.addon_id);
            const allMatched = dto.addon_ids.every(id => targetAddonIds.includes(id));
            if (!allMatched) {
                return {
                    isValid: false,
                    error: this.i18n.t('coupon.errors.addon_not_applicable', { lang }),
                };
            }
        }

        return {
            isValid: true,
            discountInfo: {
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                max_discount_amount: coupon.is_unlimited_discount ? null : coupon.max_discount_amount,
            },
        };
    }

    private async invalidateCache(id: string) {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache() {
        await this.redisService.delByPattern('coupon:list:*');
        await this.redisService.delByPattern('coupon:public:*');
    }
}
