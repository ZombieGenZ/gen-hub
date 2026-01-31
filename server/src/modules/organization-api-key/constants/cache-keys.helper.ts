import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationApiKeyCacheKeys {
    constructor(private readonly configService: ConfigService) { }

    // Get TTL from config
    get ttlItem(): number {
        return this.configService.get<number>('cache.organizationApiKey.ttl.item') ?? 300;
    }
    get ttlList(): number {
        return this.configService.get<number>('cache.organizationApiKey.ttl.list') ?? 60;
    }

    // Get cache key prefixes
    private get keyPrefixItem(): string {
        return this.configService.get<string>('cache.organizationApiKey.keys.item') ?? 'org:apikey';
    }
    private get keyPrefixList(): string {
        return this.configService.get<string>('cache.organizationApiKey.keys.list') ?? 'org:apikey:list';
    }

    // Generate cache keys
    item(orgId: string, apiKeyId: string): string {
        return `${this.keyPrefixItem}:${orgId}:${apiKeyId}`;
    }

    list(orgId: string): string {
        return `${this.keyPrefixList}:${orgId}`;
    }

    // Pattern for invalidation
    allByOrg(orgId: string): string {
        return `${this.keyPrefixItem}:${orgId}:*`;
    }
}
