import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationUpdateRequestCacheKeys {
  constructor(private readonly configService: ConfigService) {}

  // Get TTL from config
  get ttlItem(): number {
    return (
      this.configService.get<number>(
        'cache.organizationUpdateRequest.ttl.item',
      ) ?? 300
    );
  }
  get ttlList(): number {
    return (
      this.configService.get<number>(
        'cache.organizationUpdateRequest.ttl.list',
      ) ?? 60
    );
  }

  // Get cache key prefixes
  private get keyPrefixItem(): string {
    return (
      this.configService.get<string>(
        'cache.organizationUpdateRequest.keys.item',
      ) ?? 'org:update-request'
    );
  }
  private get keyPrefixList(): string {
    return (
      this.configService.get<string>(
        'cache.organizationUpdateRequest.keys.list',
      ) ?? 'org:update-request:list'
    );
  }

  // Generate cache keys
  item(id: string): string {
    return `${this.keyPrefixItem}:${id}`;
  }

  list(query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `${this.keyPrefixList}:${sortedParams}`;
  }

  // Pattern for invalidation
  allList(): string {
    return `${this.keyPrefixList}:*`;
  }
}
