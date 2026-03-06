import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryPhoneCodeDto } from '../dto';

@Injectable()
export class PhoneCodeCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  get listTtl(): number {
    return this.configService.get<number>('REDIS_PHONE_CODE_LIST_CACHE_TTL') || 60;
  }

  get detailTtl(): number {
    return this.configService.get<number>('REDIS_PHONE_CODE_CACHE_TTL') || 300;
  }

  private get prefix(): string {
    return this.configService.get<string>('REDIS_PHONE_CODE_KEY_PREFIX') || 'phone-code';
  }

  private get listPrefix(): string {
    return this.configService.get<string>('REDIS_PHONE_CODE_LIST_KEY_PREFIX') || 'phone-code:list';
  }

  private get detailPrefix(): string {
    return this.configService.get<string>('REDIS_PHONE_CODE_DETAIL_KEY_PREFIX') || 'phone-code:detail';
  }

  list(query: QueryPhoneCodeDto): string {
    const sortedParams = Object.keys(query)
      .sort()
      .filter((key) => query[key as keyof QueryPhoneCodeDto] !== undefined)
      .map((key) => `${key}=${query[key as keyof QueryPhoneCodeDto]}`)
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
