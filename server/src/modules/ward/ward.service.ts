import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { WardRepository } from './ward.repository';
import { RedisService } from '../redis/redis.service';
import { QueryWardDto } from './dto';
import { IWard, IWardWithProvince, IPaginatedResponse } from './interfaces';

@Injectable()
export class WardService {
    private readonly WARD_LIST_TTL: number;
    private readonly WARD_DETAIL_TTL: number;

    constructor(
        private readonly repository: WardRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.WARD_LIST_TTL = this.configService.get<number>('REDIS_WARD_LIST_TTL') || 86400;
        this.WARD_DETAIL_TTL = this.configService.get<number>('REDIS_WARD_DETAIL_TTL') || 86400;
    }

    /**
     * Lấy cache key cho danh sách phường/xã
     */
    private getListCacheKey(query: QueryWardDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryWardDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryWardDto]}`)
            .join('&');
        return `ward:list:${sortedParams}`;
    }

    /**
     * Lấy cache key cho chi tiết phường/xã
     */
    private getDetailCacheKey(id: string): string {
        return `ward:detail:${id}`;
    }

    /**
     * Lấy cache key cho danh sách phường/xã theo tỉnh
     */
    private getByProvinceCacheKey(provinceId: string, query: QueryWardDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryWardDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryWardDto]}`)
            .join('&');
        return `ward:province:${provinceId}:${sortedParams}`;
    }

    /**
     * Lấy danh sách phường/xã với cache
     */
    async findMany(query: QueryWardDto, lang: string): Promise<IPaginatedResponse<IWard>> {
        const cacheKey = this.getListCacheKey(query);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const { items, total } = await this.repository.findMany(query);

        const result: IPaginatedResponse<IWard> = {
            items,
            total,
            limit: query.limit || 100,
            offset: query.offset || 0,
            hasMore: (query.offset || 0) + items.length < total,
        };

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.WARD_LIST_TTL);

        return result;
    }

    /**
     * Lấy chi tiết phường/xã theo ID với cache
     */
    async findById(id: string, lang: string): Promise<IWardWithProvince> {
        const cacheKey = this.getDetailCacheKey(id);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const ward = await this.repository.findById(id);

        if (!ward) {
            throw new NotFoundException(
                await this.i18n.translate('ward.errors.not_found', { lang }),
            );
        }

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(ward), this.WARD_DETAIL_TTL);

        return ward;
    }

    /**
     * Lấy danh sách phường/xã theo province ID với cache
     */
    async findByProvinceId(provinceId: string, query: QueryWardDto, lang: string): Promise<IPaginatedResponse<IWard>> {
        const cacheKey = this.getByProvinceCacheKey(provinceId, query);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const { items, total } = await this.repository.findByProvinceId(provinceId, query);

        const result: IPaginatedResponse<IWard> = {
            items,
            total,
            limit: query.limit || 100,
            offset: query.offset || 0,
            hasMore: (query.offset || 0) + items.length < total,
        };

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.WARD_LIST_TTL);

        return result;
    }
}
