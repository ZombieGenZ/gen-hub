import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryProvinceDto } from '../dto';

@Injectable()
export class ProvinceCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Cache TTL for province list (default: 86400 seconds = 1 day)
   */
  get listTtl(): number {
    return this.configService.get<number>('REDIS_PROVINCE_LIST_TTL') || 86400;
  }

  /**
   * Cache TTL for province detail (default: 86400 seconds = 1 day)
   */
  get detailTtl(): number {
    return this.configService.get<number>('REDIS_PROVINCE_DETAIL_TTL') || 86400;
  }

  private get prefix(): string {
    return (
      this.configService.get<string>('REDIS_PROVINCE_KEY_PREFIX') || 'province'
    );
  }

  private get listPrefix(): string {
    return (
      this.configService.get<string>('REDIS_PROVINCE_LIST_KEY_PREFIX') ||
      'province:list'
    );
  }

  private get detailPrefix(): string {
    return (
      this.configService.get<string>('REDIS_PROVINCE_DETAIL_KEY_PREFIX') ||
      'province:detail'
    );
  }

  /**
   * Generate cache key for province list
   */
  list(query: QueryProvinceDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryProvinceDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryProvinceDto]}`)
      .join('&');
    return `${this.listPrefix}:${sortedParams}`;
  }

  /**
   * Generate cache key for province detail
   */
  detail(id: string): string {
    return `${this.detailPrefix}:${id}`;
  }

  /**
   * Pattern to match all province cache keys
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
