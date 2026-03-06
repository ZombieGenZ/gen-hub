import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryCoverImageDto } from '../dto';

@Injectable()
export class CoverImageCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  get listTtl(): number {
    return this.configService.get<number>('REDIS_COVER_IMAGE_LIST_CACHE_TTL') || 60;
  }

  get detailTtl(): number {
    return this.configService.get<number>('REDIS_COVER_IMAGE_CACHE_TTL') || 300;
  }

  private get prefix(): string {
    return this.configService.get<string>('REDIS_COVER_IMAGE_KEY_PREFIX') || 'cover-image';
  }

  private get listPrefix(): string {
    return this.configService.get<string>('REDIS_COVER_IMAGE_LIST_KEY_PREFIX') || 'cover-image:list';
  }

  private get detailPrefix(): string {
    return this.configService.get<string>('REDIS_COVER_IMAGE_DETAIL_KEY_PREFIX') || 'cover-image:detail';
  }

  list(query: QueryCoverImageDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryCoverImageDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryCoverImageDto]}`)
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
