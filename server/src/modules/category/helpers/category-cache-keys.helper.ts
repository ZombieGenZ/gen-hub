import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating Category-related cache keys
 * Ensures all cache keys are derived from environment configuration
 */
@Injectable()
export class CategoryCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get cache key prefix from config
   */
  private getKeyPrefix(type: 'item' | 'list' | 'active'): string {
    return (
      this.configService.get<string>(`cache.category.keys.${type}`) ||
      `category:${type}`
    );
  }

  /**
   * Get TTL from config
   */
  getTtl(type: 'item' | 'list'): number {
    return this.configService.get<number>(`cache.category.ttl.${type}`) || 300;
  }

  /**
   * Generate cache key for single category by ID
   */
  item(id: string): string {
    return `${this.getKeyPrefix('item')}:${id}`;
  }

  /**
   * Generate cache key for category by slug
   */
  bySlug(slug: string): string {
    return `${this.getKeyPrefix('item')}:slug:${slug}`;
  }

  /**
   * Generate cache key for category list with filters
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
   * Generate cache key for active categories
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
   * Generate cache key pattern for active categories invalidation
   */
  activePattern(): string {
    return `${this.getKeyPrefix('active')}:*`;
  }

  /**
   * Generate cache key for category tree structure
   */
  tree(parentId?: string): string {
    const prefix = this.getKeyPrefix('list');
    return parentId ? `${prefix}:tree:${parentId}` : `${prefix}:tree:root`;
  }

  /**
   * Generate cache key pattern for tree invalidation
   */
  treePattern(): string {
    return `${this.getKeyPrefix('list')}:tree:*`;
  }
}
