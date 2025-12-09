import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Service
 * Wrapper service cho Redis operations
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  /** TTL mặc định cho user cache (5 phút) */
  private readonly USER_CACHE_TTL = 300;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      this.client = new Redis(redisUrl);
    } else {
      this.client = new Redis({
        host: this.configService.get<string>('REDIS_HOST') || 'localhost',
        port: this.configService.get<number>('REDIS_PORT') || 6379,
        password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      });
    }
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('✅ Redis connected successfully');
    } catch (error) {
      this.logger.error('❌ Redis connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  /**
   * Lấy Redis client gốc
   */
  getClient(): Redis {
    return this.client;
  }

  // ===================
  // BASIC OPERATIONS
  // ===================

  /**
   * Lấy giá trị từ key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Lưu giá trị với key
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.setex(key, ttlSeconds, value);
    }
    return this.client.set(key, value);
  }

  /**
   * Xóa key
   */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Xóa nhiều keys theo pattern
   */
  async delByPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  /**
   * Kiểm tra key có tồn tại không
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ===================
  // USER CACHE OPERATIONS
  // ===================

  /**
   * Tạo cache key cho user profile
   */
  private getUserCacheKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  /**
   * Lấy user profile từ cache
   */
  async getUserCache<T>(userId: string): Promise<T | null> {
    const data = await this.get(this.getUserCacheKey(userId));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Lưu user profile vào cache
   */
  async setUserCache<T>(
    userId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.USER_CACHE_TTL;
    await this.set(this.getUserCacheKey(userId), JSON.stringify(data), ttl);
  }

  /**
   * Xóa user profile cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(this.getUserCacheKey(userId));
    this.logger.debug(`User cache invalidated: ${userId}`);
  }

  /**
   * Xóa tất cả cache của user (profile, sessions, etc.)
   */
  async invalidateAllUserCache(userId: string): Promise<void> {
    await this.delByPattern(`user:*:${userId}`);
    this.logger.debug(`All user cache invalidated: ${userId}`);
  }
}
