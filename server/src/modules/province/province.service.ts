import { Injectable, NotFoundException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ProvinceRepository } from './province.repository';
import { RedisService } from '../redis/redis.service';
import { QueryProvinceDto } from './dto';
import { IProvince, IProvinceWithWards } from './types';
import { ProvinceCacheKeysHelper } from './constants/province-cache-keys.helper';

@Injectable()
export class ProvinceService {
  constructor(
    private readonly repository: ProvinceRepository,
    private readonly redisService: RedisService,
    private readonly i18n: I18nService,
    private readonly cacheKeys: ProvinceCacheKeysHelper,
  ) {}

  /**
   * Lấy danh sách tất cả tỉnh/thành với cache
   */
  async findMany(query: QueryProvinceDto, lang: string): Promise<IProvince[]> {
    const cacheKey = this.cacheKeys.list(query);

    // Kiểm tra cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query từ database
    const items = await this.repository.findMany(query);

    // Lưu vào cache
    await this.redisService.set(
      cacheKey,
      JSON.stringify(items),
      this.cacheKeys.listTtl,
    );

    return items;
  }

  /**
   * Lấy chi tiết tỉnh/thành theo ID với cache
   */
  async findById(id: string, lang: string): Promise<IProvinceWithWards> {
    const cacheKey = this.cacheKeys.detail(id);

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
    await this.redisService.set(
      cacheKey,
      JSON.stringify(province),
      this.cacheKeys.detailTtl,
    );

    return province;
  }
}
