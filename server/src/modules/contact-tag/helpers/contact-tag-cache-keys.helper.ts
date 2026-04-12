import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating Contact Tag cache keys
 * Ensures all cache keys are derived from environment configuration
 */
@Injectable()
export class ContactTagCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get cache key prefix from config
   */
  private getKeyPrefix(type: 'item' | 'list' | 'active'): string {
    return (
      this.configService.get<string>(`cache.contactTag.keys.${type}`) ||
      `contact-tag:${type}`
    );
  }

  /**
   * Get TTL from config
   */
  getTtl(type: 'item' | 'list'): number {
    return (
      this.configService.get<number>(`cache.contactTag.ttl.${type}`) || 300
    );
  }

  /**
   * Generate cache key for single contact tag by ID
   */
  item(id: string): string {
    return `${this.getKeyPrefix('item')}:${id}`;
  }

  /**
   * Generate cache key for contact tag by slug
   */
  bySlug(slug: string): string {
    return `${this.getKeyPrefix('item')}:slug:${slug}`;
  }

  /**
   * Generate cache key for contact tag list with filters
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
   * Generate cache key for active tags
   */
  active(filters?: object): string {
    const prefix = this.getKeyPrefix('active');
    if (!filters || Object.keys(filters).length === 0) {
      return prefix;
    }
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${prefix}:${hash}`;
  }

  /**
   * Generate cache key pattern for active tags invalidation
   */
  activePattern(): string {
    return `${this.getKeyPrefix('active')}:*`;
  }
}
