import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryWardDto } from '../dto';

@Injectable()
export class WardCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Cache TTL for ward list (default: 86400 seconds = 1 day)
   */
  get listTtl(): number {
    return this.configService.get<number>('REDIS_WARD_LIST_TTL') || 86400;
  }

  /**
   * Cache TTL for ward detail (default: 86400 seconds = 1 day)
   */
  get detailTtl(): number {
    return this.configService.get<number>('REDIS_WARD_DETAIL_TTL') || 86400;
  }

  private get prefix(): string {
    return this.configService.get<string>('REDIS_WARD_KEY_PREFIX') || 'ward';
  }

  private get listPrefix(): string {
    return (
      this.configService.get<string>('REDIS_WARD_LIST_KEY_PREFIX') ||
      'ward:list'
    );
  }

  private get detailPrefix(): string {
    return (
      this.configService.get<string>('REDIS_WARD_DETAIL_KEY_PREFIX') ||
      'ward:detail'
    );
  }

  private get byProvincePrefix(): string {
    return (
      this.configService.get<string>('REDIS_WARD_BY_PROVINCE_KEY_PREFIX') ||
      'ward:province'
    );
  }

  /**
   * Generate cache key for ward list
   */
  list(query: QueryWardDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryWardDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryWardDto]}`)
      .join('&');
    return `${this.listPrefix}:${sortedParams}`;
  }

  /**
   * Generate cache key for ward detail
   */
  detail(id: string): string {
    return `${this.detailPrefix}:${id}`;
  }

  /**
   * Generate cache key for wards by province
   */
  byProvince(provinceId: string, query: QueryWardDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryWardDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryWardDto]}`)
      .join('&');
    return `${this.byProvincePrefix}:${provinceId}:${sortedParams}`;
  }

  /**
   * Pattern to match all ward cache keys
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
