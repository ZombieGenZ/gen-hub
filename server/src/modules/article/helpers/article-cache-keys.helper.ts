import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating Article-related cache keys
 * Ensures all cache keys are derived from environment configuration
 */
@Injectable()
export class ArticleCacheKeysHelper {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get cache key prefix from config
   */
  private getKeyPrefix(
    type: 'item' | 'list' | 'public' | 'emoji' | 'comment',
  ): string {
    return (
      this.configService.get<string>(`cache.article.keys.${type}`) ||
      `article:${type}`
    );
  }

  /**
   * Get TTL from config
   */
  getTtl(type: 'item' | 'list' | 'emoji' | 'comment'): number {
    return this.configService.get<number>(`cache.article.ttl.${type}`) || 300;
  }

  /**
   * Generate cache key for single article by ID
   */
  item(id: string): string {
    return `${this.getKeyPrefix('item')}:${id}`;
  }

  /**
   * Generate cache key for article by slug
   */
  bySlug(slug: string): string {
    return `${this.getKeyPrefix('item')}:slug:${slug}`;
  }

  /**
   * Generate cache key for article list with filters
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
   * Generate cache key for public articles (published)
   */
  public(filters?: object): string {
    const prefix = this.getKeyPrefix('public');
    if (!filters || Object.keys(filters).length === 0) {
      return prefix;
    }
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${prefix}:${hash}`;
  }

  /**
   * Generate cache key pattern for public articles invalidation
   */
  publicPattern(): string {
    return `${this.getKeyPrefix('public')}:*`;
  }

  /**
   * Generate cache key for article emojis
   */
  emoji(articleId: string): string {
    return `${this.getKeyPrefix('emoji')}:${articleId}`;
  }

  /**
   * Generate cache key pattern for emoji invalidation
   */
  emojiPattern(): string {
    return `${this.getKeyPrefix('emoji')}:*`;
  }

  /**
   * Generate cache key for article comments
   */
  comment(articleId: string, filters?: object): string {
    const prefix = `${this.getKeyPrefix('comment')}:${articleId}`;
    if (!filters || Object.keys(filters).length === 0) {
      return prefix;
    }
    const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
    return `${prefix}:${hash}`;
  }

  /**
   * Generate cache key pattern for comment invalidation
   */
  commentPattern(articleId?: string): string {
    if (articleId) {
      return `${this.getKeyPrefix('comment')}:${articleId}:*`;
    }
    return `${this.getKeyPrefix('comment')}:*`;
  }
}
