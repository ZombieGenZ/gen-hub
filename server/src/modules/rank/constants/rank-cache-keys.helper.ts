import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryRankDto } from '../dto';

@Injectable()
export class RankCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  get listTtl(): number {
    return this.configService.get<number>('REDIS_RANK_LIST_CACHE_TTL') || 60;
  }

  get detailTtl(): number {
    return this.configService.get<number>('REDIS_RANK_CACHE_TTL') || 300;
  }

  private get prefix(): string {
    return this.configService.get<string>('REDIS_RANK_KEY_PREFIX') || 'rank';
  }

  private get listPrefix(): string {
    return this.configService.get<string>('REDIS_RANK_LIST_KEY_PREFIX') || 'rank:list';
  }

  private get detailPrefix(): string {
    return this.configService.get<string>('REDIS_RANK_DETAIL_KEY_PREFIX') || 'rank:detail';
  }

  list(query: QueryRankDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryRankDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryRankDto]}`)
      .join('&');
    return `${this.listPrefix}:${sortedParams}`;
  }

  detail(id: string): string {
    return `${this.detailPrefix}:${id}`;
  }

  listPattern(): string {
    return `${this.listPrefix}*`;
  }

  allPattern(): string {
    return `${this.prefix}*`;
  }
}
