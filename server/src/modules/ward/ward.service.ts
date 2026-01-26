import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { WardRepository } from './ward.repository';
import { RedisService } from '../redis/redis.service';
import { QueryWardDto } from './dto';
import { IWard, IWardWithProvince } from './types';
import { WardCacheKeysHelper } from './constants/ward-cache-keys.helper';

@Injectable()
export class WardService {
    constructor(
        private readonly repository: WardRepository,
        private readonly redisService: RedisService,
        private readonly i18n: I18nService,
        private readonly cacheKeys: WardCacheKeysHelper,
    ) { }

    /**
     * Lấy danh sách tất cả phường/xã với cache
     */
    async findMany(query: QueryWardDto, lang: string): Promise<IWard[]> {
        const cacheKey = this.cacheKeys.list(query);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const items = await this.repository.findMany(query);

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(items), this.cacheKeys.listTtl);

        return items;
    }

    /**
     * Lấy chi tiết phường/xã theo ID với cache
     */
    async findById(id: string, lang: string): Promise<IWardWithProvince> {
        const cacheKey = this.cacheKeys.detail(id);

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
        await this.redisService.set(cacheKey, JSON.stringify(ward), this.cacheKeys.detailTtl);

        return ward;
    }

    /**
     * Lấy danh sách phường/xã theo province ID với cache
     */
    async findByProvinceId(provinceId: string, query: QueryWardDto, lang: string): Promise<IWard[]> {
        const cacheKey = this.cacheKeys.byProvince(provinceId, query);

        // Kiểm tra cache
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Query từ database
        const items = await this.repository.findByProvinceId(provinceId, query);

        // Lưu vào cache
        await this.redisService.set(cacheKey, JSON.stringify(items), this.cacheKeys.listTtl);

        return items;
    }
}
