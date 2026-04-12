import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryAddonTypeDto } from '../dto';

@Injectable()
export class AddonTypeCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Cache TTL for addon types list (default: 60 seconds)
   */
  get listTtl(): number {
    return (
      this.configService.get<number>('REDIS_ADDON_TYPE_LIST_CACHE_TTL') || 60
    );
  }

  /**
   * Cache TTL for addon type detail (default: 300 seconds)
   */
  get detailTtl(): number {
    return this.configService.get<number>('REDIS_ADDON_TYPE_CACHE_TTL') || 300;
  }

  private get prefix(): string {
    return (
      this.configService.get<string>('REDIS_ADDON_TYPE_KEY_PREFIX') ||
      'addon-type'
    );
  }

  private get listPrefix(): string {
    return (
      this.configService.get<string>('REDIS_ADDON_TYPE_LIST_KEY_PREFIX') ||
      'addon-type:list'
    );
  }

  private get detailPrefix(): string {
    return (
      this.configService.get<string>('REDIS_ADDON_TYPE_DETAIL_KEY_PREFIX') ||
      'addon-type:detail'
    );
  }

  private get activePrefix(): string {
    return (
      this.configService.get<string>('REDIS_ADDON_TYPE_ACTIVE_KEY_PREFIX') ||
      'addon-type:active'
    );
  }

  /**
   * Generate cache key for addon type list
   */
  list(query: QueryAddonTypeDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryAddonTypeDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryAddonTypeDto]}`)
      .join('&');
    return `${this.listPrefix}:${sortedParams}`;
  }

  /**
   * Generate cache key for addon type detail
   */
  detail(id: string): string {
    return `${this.detailPrefix}:${id}`;
  }

  /**
   * Cache key for active addon types
   */
  active(): string {
    return this.activePrefix;
  }

  /**
   * Pattern to match all addon type cache keys
   */
  allPattern(): string {
    return `${this.prefix}*`;
  }

  /**
   * Pattern to match all list cache keys
   */
  listPattern(): string {
    return `${this.listPrefix}*`;
  }
}
