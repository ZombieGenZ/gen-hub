import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Helper class for generating Contact-related cache keys
 * Ensures all cache keys are derived from environment configuration
 */
@Injectable()
export class ContactCacheKeysHelper {
    constructor(private readonly configService: ConfigService) { }

    /**
     * Get cache key prefix from config
     */
    private getKeyPrefix(type: 'item' | 'detail' | 'staff' | 'priority' | 'normal' | 'skipped'): string {
        return this.configService.get<string>(`cache.contact.keys.${type}`) || `contact:${type}`;
    }

    /**
     * Get TTL from config
     */
    getTtl(type: 'item' | 'list'): number {
        return this.configService.get<number>(`cache.contact.ttl.${type}`) || 300;
    }

    /**
     * Generate cache key for single contact conversation by ID
     */
    item(id: string): string {
        return `${this.getKeyPrefix('item')}:${id}`;
    }

    /**
     * Generate cache key for contact detail by ID
     */
    detail(id: string): string {
        return `${this.getKeyPrefix('detail')}:${id}`;
    }

    /**
     * Generate cache key for contact staff assignments
     */
    staff(id: string): string {
        return `${this.getKeyPrefix('staff')}:${id}`;
    }

    /**
     * Generate cache key for contact list with filters
     */
    list(filters?: object): string {
        const prefix = this.getKeyPrefix('item');
        const listPrefix = `${prefix}:list`;
        if (!filters || Object.keys(filters).length === 0) {
            return listPrefix;
        }
        const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
        return `${listPrefix}:${hash}`;
    }

    /**
     * Generate cache key pattern for list invalidation
     */
    listPattern(): string {
        return `${this.getKeyPrefix('item')}:list:*`;
    }

    /**
     * Generate cache key for priority contact list
     */
    priority(filters?: object): string {
        const prefix = this.getKeyPrefix('priority');
        if (!filters || Object.keys(filters).length === 0) {
            return prefix;
        }
        const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
        return `${prefix}:${hash}`;
    }

    /**
     * Generate cache key pattern for priority list invalidation
     */
    priorityPattern(): string {
        return `${this.getKeyPrefix('priority')}:*`;
    }

    /**
     * Generate cache key for normal contact list
     */
    normal(filters?: object): string {
        const prefix = this.getKeyPrefix('normal');
        if (!filters || Object.keys(filters).length === 0) {
            return prefix;
        }
        const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
        return `${prefix}:${hash}`;
    }

    /**
     * Generate cache key pattern for normal list invalidation
     */
    normalPattern(): string {
        return `${this.getKeyPrefix('normal')}:*`;
    }

    /**
     * Generate cache key for skipped contact list
     */
    skipped(filters?: object): string {
        const prefix = this.getKeyPrefix('skipped');
        if (!filters || Object.keys(filters).length === 0) {
            return prefix;
        }
        const hash = Buffer.from(JSON.stringify(filters)).toString('base64');
        return `${prefix}:${hash}`;
    }

    /**
     * Generate cache key pattern for skipped list invalidation
     */
    skippedPattern(): string {
        return `${this.getKeyPrefix('skipped')}:*`;
    }
}
