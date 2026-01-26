import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class cho việc tạo cache keys cho Coupon Schedule module
 * Tất cả cache key prefixes được lấy từ biến môi trường
 * 
 * @example
 * ```typescript
 * // Inject vào service
 * constructor(private readonly cacheKeys: CouponScheduleCacheKeys) {}
 * 
 * // Sử dụng
 * const cacheKey = this.cacheKeys.item(id);
 * await this.redisService.get(cacheKey);
 * ```
 */
@Injectable()
export class CouponScheduleCacheKeys {
    constructor(private readonly configService: ConfigService) {}

    /**
     * Get cache key prefixes from environment
     */
    private getPrefix(type: 'item' | 'list' | 'page'): string {
        return this.configService.get<string>(
            `cache.couponSchedule.keys.${type}`
        ) || (type === 'item' ? 'coupon-schedule' : type === 'list' ? 'coupon-schedule:list' : 'coupon-schedule:page');
    }

    /**
     * Generate cache key for single item
     * @param id - Coupon Schedule ID
     * @returns Cache key string
     */
    item(id: string): string {
        return `${this.getPrefix('item')}:${id}`;
    }

    /**
     * Generate cache key for list
     * @param filters - Optional filters object
     * @returns Cache key string
     */
    list(filters?: Record<string, any>): string {
        const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
        return `${this.getPrefix('list')}${filterStr}`;
    }

    /**
     * Generate cache key for pagination
     * @param page - Page number
     * @param limit - Items per page
     * @param filters - Optional filters object
     * @returns Cache key string
     */
    page(page: number, limit: number, filters?: Record<string, any>): string {
        const filterStr = filters ? `:${JSON.stringify(filters)}` : '';
        return `${this.getPrefix('page')}:${page}:${limit}${filterStr}`;
    }

    /**
     * Get TTL from environment
     */
    getTTL(type: 'item' | 'list' | 'page'): number {
        return this.configService.get<number>(
            `cache.couponSchedule.ttl.${type}`
        ) || (type === 'item' ? 300 : type === 'list' ? 60 : 600);
    }
}
