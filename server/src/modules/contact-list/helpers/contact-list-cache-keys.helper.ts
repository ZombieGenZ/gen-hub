import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating Contact List (Blacklist/Whitelist) cache keys
 * Ensures all cache keys are derived from environment configuration
 */
@Injectable()
export class ContactListCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get cache key prefix from config
   */
  private getKeyPrefix(type: 'item' | 'list' | 'email' | 'ip'): string {
    return (
      this.configService.get<string>(`cache.contactList.keys.${type}`) ||
      `contact-list:${type}`
    );
  }

  /**
   * Get TTL from config
   */
  getTtl(type: 'item' | 'list'): number {
    return (
      this.configService.get<number>(`cache.contactList.ttl.${type}`) || 3600
    );
  }

  /**
   * Generate cache key for single contact list entry by ID
   */
  item(id: string): string {
    return `${this.getKeyPrefix('item')}:${id}`;
  }

  /**
   * Generate cache key for contact list entries with filters
   */
  list(filters?: object): string {
    const prefix = this.getKeyPrefix('list');
    if (!filters || Object.keys(filters).length === 0) {
      return prefix;
    }
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${prefix}:${hash}`;
  }

  /**
   * Generate cache key pattern for list invalidation
   */
  listPattern(): string {
    return `${this.getKeyPrefix('list')}:*`;
  }

  /**
   * Generate cache key for email lookup
   */
  email(email: string): string {
    return `${this.getKeyPrefix('email')}:${email.toLowerCase()}`;
  }

  /**
   * Generate cache key pattern for email invalidation
   */
  emailPattern(): string {
    return `${this.getKeyPrefix('email')}:*`;
  }

  /**
   * Generate cache key for IP lookup
   */
  ip(ipAddress: string): string {
    return `${this.getKeyPrefix('ip')}:${ipAddress}`;
  }

  /**
   * Generate cache key pattern for IP invalidation
   */
  ipPattern(): string {
    return `${this.getKeyPrefix('ip')}:*`;
  }

  /**
   * Generate cache key for blacklist
   */
  blacklist(filters?: object): string {
    const prefix = this.getKeyPrefix('list');
    const blacklistPrefix = `${prefix}:blacklist`;
    if (!filters || Object.keys(filters).length === 0) {
      return blacklistPrefix;
    }
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${blacklistPrefix}:${hash}`;
  }

  /**
   * Generate cache key for whitelist
   */
  whitelist(filters?: object): string {
    const prefix = this.getKeyPrefix('list');
    const whitelistPrefix = `${prefix}:whitelist`;
    if (!filters || Object.keys(filters).length === 0) {
      return whitelistPrefix;
    }
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${whitelistPrefix}:${hash}`;
  }
}
