import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryAmenityDto } from '../dto';

@Injectable()
export class AmenityCacheKeysHelper {
    constructor(private readonly configService: ConfigService) { }

    /**
    * Cache TTL for amenity list (default: 60 seconds)
    */
    get listTtl(): number {
        return this.configService.get<number>('REDIS_AMENITY_LIST_CACHE_TTL') || 60;
    }

    /**
    * Cache TTL for amenity detail (default: 300 seconds)
    */
    get detailTtl(): number {
        return this.configService.get<number>('REDIS_AMENITY_CACHE_TTL') || 300;
    }

    private get prefix(): string {
        return this.configService.get<string>('REDIS_AMENITY_KEY_PREFIX') || 'amenity';
    }

    private get listPrefix(): string {
        return (
            this.configService.get<string>('REDIS_AMENITY_LIST_KEY_PREFIX') ||
            'amenity:list'
        );
    }

    private get detailPrefix(): string {
        return (
            this.configService.get<string>('REDIS_AMENITY_DETAIL_KEY_PREFIX') ||
            'amenity:detail'
        );
    }

    /**
    * Generate cache key for amenity list
    */
    list(query: QueryAmenityDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter((key) => query[key as keyof QueryAmenityDto] !== undefined)
            .map((key) => `${key}=${query[key as keyof QueryAmenityDto]}`)
            .join('&');
        return `${this.listPrefix}:${sortedParams}`;
    }

    /**
    * Generate cache key for amenity detail
    */
    detail(id: string): string {
        return `${this.detailPrefix}:${id}`;
    }

    /**
    * Pattern to match all amenity cache keys
    */
    allPattern(): string {
        return `${this.prefix}*`;
    }

    /**
    * Pattern to match all list cache keys
    */
    listPattern(): string {
        return `${this.listPrefix}*`;
    }
}
