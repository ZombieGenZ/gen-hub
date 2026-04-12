import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class cho việc tạo cache keys cho App Config
 * Tất cả cache key prefixes được lấy từ biến môi trường
 *
 * @example
 * ```typescript
 * // Inject vào service
 * constructor(private readonly cacheKeys: AppConfigCacheKeys) {}
 *
 * // Sử dụng
 * const cacheKey = this.cacheKeys.key;
 * await this.redisService.get(cacheKey);
 * ```
 */
@Injectable()
export class AppConfigCacheKeys {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Lấy cache key prefix từ environment
   * Fallback về 'app:config' nếu không có trong .env
   */
  private get prefix(): string {
    return (
      this.configService.get<string>('REDIS_APP_CONFIG_KEY_PREFIX') ||
      'app:config'
    );
  }

  /**
   * Lấy cache key cho app config
   * @returns Cache key string từ biến môi trường
   */
  get key(): string {
    return this.prefix;
  }
}
