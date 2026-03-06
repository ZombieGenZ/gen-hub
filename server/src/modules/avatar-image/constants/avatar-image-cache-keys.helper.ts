import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryAvatarImageDto } from '../dto';

@Injectable()
export class AvatarImageCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  get listTtl(): number {
    return this.configService.get<number>('REDIS_AVATAR_IMAGE_LIST_CACHE_TTL') || 60;
  }

  get detailTtl(): number {
    return this.configService.get<number>('REDIS_AVATAR_IMAGE_CACHE_TTL') || 300;
  }

  private get prefix(): string {
    return this.configService.get<string>('REDIS_AVATAR_IMAGE_KEY_PREFIX') || 'avatar-image';
  }

  private get listPrefix(): string {
    return this.configService.get<string>('REDIS_AVATAR_IMAGE_LIST_KEY_PREFIX') || 'avatar-image:list';
  }

  private get detailPrefix(): string {
    return this.configService.get<string>('REDIS_AVATAR_IMAGE_DETAIL_KEY_PREFIX') || 'avatar-image:detail';
  }

  list(query: QueryAvatarImageDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryAvatarImageDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryAvatarImageDto]}`)
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
