import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { PublicCouponRepository } from './repositories/public-coupon.repository';
import { PublicCouponCacheKeys } from './constants/public-coupon-cache-keys.helper';
import { RedisService } from '../redis/redis.service';
import { QueryPublicCouponDto, CheckApplicableCouponDto, ValidateCouponDto } from './dto';

@Injectable()
export class PublicCouponService {
    constructor(
        private readonly repository: PublicCouponRepository,
        private readonly cacheKeys: PublicCouponCacheKeys,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {}

    /**
     * Lấy danh sách coupon công khai
     */
    async findAllPublic(query: QueryPublicCouponDto) {
        const { limit = 10, offset = 0, keywords } = query;

        // Check cache - Cache-Aside Pattern
        const cacheKey = this.cacheKeys.list({ limit, offset, keywords });
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

        // Parallel execution for better performance
        const [data, total] = await Promise.all([
            this.repository.findAllPublic({
                skip: offset,
                take: limit,
                where,
                orderBy: { created_at: 'desc' },
            }),
            this.repository.countPublic(where),
        ]);

        const hasMore = offset + data.length < total;
        const result = { items: data, total, limit, offset, hasMore };
        
        // Set cache with TTL from environment
        const ttl = this.cacheKeys.getTTL('list');
        await this.redisService.set(cacheKey, JSON.stringify(result), ttl);

        return result;
    }

    /**
     * Lưu coupon vào tài khoản user
     */
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

    /**
     * Bỏ lưu coupon khỏi tài khoản user
     */
    async unsaveCoupon(userId: string, couponId: string, lang: string) {
        const existing = await this.repository.findSavedCouponByUser(userId, couponId);
        if (!existing) {
            throw new NotFoundException(
                this.i18n.t('coupon.errors.not_saved', { lang }),
            );
        }

        await this.repository.unsaveCouponForUser(userId, couponId, userId);
    }

    /**
     * Lấy danh sách coupon đã lưu của user
     */
    async getSavedCoupons(userId: string, query: QueryPublicCouponDto) {
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
        dto: CheckApplicableCouponDto,
        lang: string,
    ) {
        // Lấy tất cả coupon đã lưu còn hiệu lực
        const savedCoupons = await this.repository.findApplicableSavedCoupons(userId);

        // Lọc coupon có thể áp dụng
        const applicableCoupons: any[] = [];

        for (const saved of savedCoupons) {
            const coupon = saved.coupon;
            
            // Kiểm tra giới hạn sử dụng
            if (coupon.max_usage > 0 && coupon.current_usage >= coupon.max_usage) {
                continue;
            }

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
        dto: ValidateCouponDto,
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
        dto: CheckApplicableCouponDto,
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
}
