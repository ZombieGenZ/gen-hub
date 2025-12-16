import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ProvinceRepository } from './province.repository';
import { RedisService } from '../redis/redis.service';
import { QueryProvinceDto } from './dto';
import { IProvince, IProvinceWithWards, IPaginatedResponse } from './interfaces';

@Injectable()
export class ProvinceService {
    private readonly PROVINCE_LIST_TTL: number;
    private readonly PROVINCE_DETAIL_TTL: number;

    constructor(
        private readonly repository: ProvinceRepository,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.PROVINCE_LIST_TTL = this.configService.get<number>('REDIS_PROVINCE_LIST_TTL') || 86400;
        this.PROVINCE_DETAIL_TTL = this.configService.get<number>('REDIS_PROVINCE_DETAIL_TTL') || 86400;
    }

    /**
     * Lấy cache key cho danh sách tỉnh/thành
     */
    private getListCacheKey(query: QueryProvinceDto): string {
        const sortedParams = Object.keys(query)
            .sort()
            .filter(key => query[key as keyof QueryProvinceDto] !== undefined)
            .map(key => `${key}=${query[key as keyof QueryProvinceDto]}`)
            .join('&');
        return `province:list:${sortedParams}`;
    }

    /**
     * Lấy cache key cho chi tiết tỉnh/thành
     */
    private getDetailCacheKey(id: string): string {
        return `province:detail:${id}`;
    }

    /**
     * Lấy danh sách tỉnh/thành với cache
     */
    async findMany(query: QueryProvinceDto, lang: string): Promise<IPaginatedResponse<IProvince>> {
        const cacheKey = this.getListCacheKey(query);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const { items, total } = await this.repository.findMany(query);

        const result: IPaginatedResponse<IProvince> = {
            items,
            total,
            limit: query.limit || 100,
            offset: query.offset || 0,
            hasMore: (query.offset || 0) + items.length < total,
        };

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(result), this.PROVINCE_LIST_TTL);

        return result;
    }

    /**
     * Lấy chi tiết tỉnh/thành theo ID với cache
     */
    async findById(id: string, lang: string): Promise<IProvinceWithWards> {
        const cacheKey = this.getDetailCacheKey(id);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const province = await this.repository.findById(id);

        if (!province) {
            throw new NotFoundException(
                await this.i18n.translate('province.errors.not_found', { lang }),
            );
        }

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(province), this.PROVINCE_DETAIL_TTL);

        return province;
    }
}
