import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CreateCacheDto } from './dto/create-cache.dto';
import { BulkCacheDto } from './dto/bulk-cache.dto';
import { UpdateCacheDto } from './dto/update-cache.dto';

@Injectable()
export class RedisAdminService {
  private readonly logger = new Logger(RedisAdminService.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Thêm 1 cache entry
   */
  async addCache(dto: CreateCacheDto) {
    await this.redisService.set(dto.key, dto.value, dto.ttl);
    return { key: dto.key };
  }

  /**
   * Thêm nhiều cache entries
   */
  async addBulkCache(dto: BulkCacheDto) {
    const promises = dto.items.map((item) =>
      this.redisService.set(item.key, item.value, item.ttl),
    );
    await Promise.all(promises);
    return { count: dto.items.length };
  }

  /**
   * Xóa 1 cache entry theo key
   */
  async removeCache(key: string) {
    const result = await this.redisService.del(key);
    return { success: result > 0 };
  }

  /**
   * Xóa nhiều cache entries theo danh sách keys
   */
  async removeBulkCache(keys: string[]) {
    const count = await this.redisService.delMany(keys);
    return { count };
  }

  /**
   * Xóa toàn bộ cache (Flush DB)
   */
  async clearAllCache() {
    await this.redisService.flushDb();
    return { success: true };
  }

  /**
   * Lấy danh sách tất cả các cache keys (có thể filter theo pattern)
   */
  async getAllCache(pattern: string = '*') {
    const keys = await this.redisService.getClient().keys(pattern);
    const result = await Promise.all(
      keys.map(async (key) => {
        const value = await this.redisService.get(key);
        const ttl = await this.redisService.ttl(key);
        return { key, value, ttl };
      }),
    );
    return result;
  }

  /**
   * Lấy chi tiết 1 cache entry theo key
   */
  async getCacheByKey(key: string) {
    const value = await this.redisService.get(key);
    const ttl = await this.redisService.ttl(key);
    return { key, value, ttl };
  }

  /**
   * Chỉnh sửa 1 cache entry
   */
  async editCache(key: string, dto: UpdateCacheDto) {
    // Kiểm tra xem key có tồn tại không
    const exists = await this.redisService.exists(key);
    if (!exists) {
      // Có thể ném lỗi NotFoundException nếu cần,
      // nhưng ở đây ta cứ set (Redis set sẽ overwrite hoặc create)
    }
    await this.redisService.set(key, dto.value, dto.ttl);
    return { key };
  }

  /**
   * Chỉnh sửa nhiều cache entries
   */
  async editBulkCache(dto: BulkCacheDto) {
    const promises = dto.items.map((item) =>
      this.redisService.set(item.key, item.value, item.ttl),
    );
    await Promise.all(promises);
    return { count: dto.items.length };
  }
}
