import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationRoleCacheKeys {
  constructor(private readonly configService: ConfigService) {}

  // Get TTL from config
  get ttlItem(): number {
    return (
      this.configService.get<number>('cache.organizationRole.ttl.item') ?? 300
    );
  }
  get ttlList(): number {
    return (
      this.configService.get<number>('cache.organizationRole.ttl.list') ?? 60
    );
  }

  // Get cache key prefixes
  private get keyPrefixItem(): string {
    return (
      this.configService.get<string>('cache.organizationRole.keys.item') ??
      'org:role'
    );
  }
  private get keyPrefixList(): string {
    return (
      this.configService.get<string>('cache.organizationRole.keys.list') ??
      'org:role:list'
    );
  }
  private get keyPrefixPermissions(): string {
    return (
      this.configService.get<string>(
        'cache.organizationRole.keys.permissions',
      ) ?? 'org:role:perms'
    );
  }

  // Generate cache keys
  item(orgId: string, roleId: string): string {
    return `${this.keyPrefixItem}:${orgId}:${roleId}`;
  }

  list(orgId: string): string {
    return `${this.keyPrefixList}:${orgId}`;
  }

  permissions(orgId: string): string {
    return `${this.keyPrefixPermissions}:${orgId}`;
  }

  // Pattern for invalidation
  allByOrg(orgId: string): string {
    return `${this.keyPrefixItem}:${orgId}:*`;
  }
}
