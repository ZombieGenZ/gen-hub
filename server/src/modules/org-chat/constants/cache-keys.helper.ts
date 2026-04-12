import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrgChatCacheKeys {
  constructor(private readonly configService: ConfigService) {}

  // Get TTL from config
  get ttlList(): number {
    return (
      this.configService.get<number>('cache.orgChat.ttl.messageList') ?? 60
    );
  }

  // Get cache key prefixes
  private get keyPrefixList(): string {
    return (
      this.configService.get<string>('cache.orgChat.keys.messageList') ??
      'org-chat:messages'
    );
  }

  // Generate cache keys
  messageList(orgId: string, query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `${this.keyPrefixList}:${orgId}:${sortedParams}`;
  }

  // Pattern for invalidation
  allMessageLists(orgId: string): string {
    return `${this.keyPrefixList}:${orgId}:*`;
  }
}
