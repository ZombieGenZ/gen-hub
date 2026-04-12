import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating SystemLog cache keys from environment variables
 * All cache key prefixes and TTLs are configurable via .env
 */
@Injectable()
export class SystemLogCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /** Cache TTL for single log entry (default: 60 seconds) */
  get itemTtl(): number {
    return this.configService.get<number>('REDIS_SYSTEM_LOG_CACHE_TTL') || 60;
  }

  /** Cache TTL for paginated list (default: 30 seconds) */
  get listTtl(): number {
    return (
      this.configService.get<number>('REDIS_SYSTEM_LOG_LIST_CACHE_TTL') || 30
    );
  }

  /** Cache TTL for statistics (default: 60 seconds) */
  get statsTtl(): number {
    return (
      this.configService.get<number>('REDIS_SYSTEM_LOG_STATS_CACHE_TTL') || 60
    );
  }

  /** Cache TTL for modules list (default: 300 seconds) */
  get modulesTtl(): number {
    return (
      this.configService.get<number>('REDIS_SYSTEM_LOG_MODULES_CACHE_TTL') ||
      300
    );
  }

  private get itemPrefix(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_KEY_PREFIX') ||
      'system:log'
    );
  }

  private get listPrefix(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_LIST_KEY_PREFIX') ||
      'system:log:list'
    );
  }

  private get statsPrefix(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_STATS_KEY_PREFIX') ||
      'system:log:stats'
    );
  }

  private get modulesPrefix(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_MODULES_KEY_PREFIX') ||
      'system:log:modules'
    );
  }

  /**
   * Generate cache key for single log entry
   * @param id - Log ID
   */
  item(id: string): string {
    return `${this.itemPrefix}:${id}`;
  }

  /**
   * Generate cache key for paginated list
   * @param filters - Query filters object
   */
  list(filters?: Record<string, unknown>): string {
    if (!filters || Object.keys(filters).length === 0) {
      return this.listPrefix;
    }
    // Create deterministic key from filters
    const filterStr = JSON.stringify(filters, Object.keys(filters).sort());
    return `${this.listPrefix}:${Buffer.from(filterStr).toString('base64').substring(0, 32)}`;
  }

  /**
   * Generate cache key for statistics
   */
  stats(): string {
    return this.statsPrefix;
  }

  /**
   * Generate cache key for unique modules list
   */
  modules(): string {
    return this.modulesPrefix;
  }

  /**
   * Pattern to match all system log cache keys
   * Used for bulk invalidation
   */
  allPattern(): string {
    return `${this.itemPrefix}*`;
  }

  /**
   * Pattern to match all list cache keys
   */
  listPattern(): string {
    return `${this.listPrefix}*`;
  }
}
