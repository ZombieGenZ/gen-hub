import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class cho việc tạo cache keys cho Public Coupon module
 * Tất cả cache key prefixes được lấy từ biến môi trường
 * 
 * @example
 * ```typescript
 * // Inject vào service
 * constructor(private readonly cacheKeys: PublicCouponCacheKeys) {}
 * 
 * // Sử dụng
 * const cacheKey = this.cacheKeys.list(filters);
 * await this.redisService.get(cacheKey);
 * ```
 */
@Injectable()
export class PublicCouponCacheKeys {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Get cache key prefixes from environment
     */
    private getPrefix(type: 'item' | 'list' | 'saved'): string {
        return this.configService.get<string>(
            `cache.publicCoupon.keys.${type}`
        ) || (type === 'item' ? 'coupon:public' : type === 'list' ? 'coupon:public:list' : 'coupon:public:saved');
    }

    /**
     * Generate cache key for single item
     * @param id - Coupon ID
     * @returns Cache key string
     */
    item(id: string): string {
        return `${this.getPrefix('item')}:${id}`;
    }

    /**
     * Generate cache key for public list
     * @param filters - Optional filters object
     * @returns Cache key string
     */
    list(filters?: Record<string, any>): string {
        const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
        return `${this.getPrefix('list')}${filterStr}`;
    }

    /**
     * Generate cache key for saved coupons by user
     * @param userId - User ID
     * @param filters - Optional filters object
     * @returns Cache key string
     */
    saved(userId: string, filters?: Record<string, any>): string {
        const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
        return `${this.getPrefix('saved')}:${userId}${filterStr}`;
    }

    /**
     * Get TTL from environment
     */
    getTTL(type: 'item' | 'list' | 'saved'): number {
        return this.configService.get<number>(
            `cache.publicCoupon.ttl.${type}`
        ) || (type === 'item' ? 300 : type === 'list' ? 60 : 300);
    }
}
