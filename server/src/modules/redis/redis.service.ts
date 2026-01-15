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

  private readonly USER_CACHE_TTL: number;
  private readonly PERMISSION_CACHE_TTL: number;
  private readonly WAREHOUSE_TEMPLATE_CACHE_TTL: number;
  private readonly WAREHOUSE_TEMPLATE_LIST_CACHE_TTL: number;
  private readonly ORGANIZATION_CACHE_TTL: number;
  private readonly ORGANIZATION_LIST_CACHE_TTL: number;
  private readonly ORGANIZATION_MEMBER_CACHE_TTL: number;

  constructor(private readonly configService: ConfigService) {
    this.USER_CACHE_TTL =
      this.configService.get<number>('REDIS_USER_CACHE_TTL') || 300;
    this.PERMISSION_CACHE_TTL =
      this.configService.get<number>('REDIS_PERMISSION_CACHE_TTL') || 300;
    this.WAREHOUSE_TEMPLATE_CACHE_TTL =
      this.configService.get<number>('REDIS_WAREHOUSE_TEMPLATE_CACHE_TTL') || 300;
    this.WAREHOUSE_TEMPLATE_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_WAREHOUSE_TEMPLATE_LIST_CACHE_TTL') || 60;
    this.ORGANIZATION_CACHE_TTL =
      this.configService.get<number>('REDIS_ORGANIZATION_CACHE_TTL') || 300;
    this.ORGANIZATION_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_ORGANIZATION_LIST_CACHE_TTL') || 60;
    this.ORGANIZATION_MEMBER_CACHE_TTL =
      this.configService.get<number>('REDIS_ORGANIZATION_MEMBER_CACHE_TTL') || 300;
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
      this.logger.log('✅ Redis connected');
    } catch (error) {
      this.logger.error('❌ Redis connection failed:', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.setex(key, ttlSeconds, value);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async delByPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Tăng giá trị của key lên 1 (atomic increment)
   * Nếu key không tồn tại, tạo mới với giá trị 1
   */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /**
   * Set TTL cho key (giây)
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.client.expire(key, ttlSeconds);
    return result === 1;
  }

  /**
   * Lấy TTL còn lại của key (giây)
   * Trả về -1 nếu key không có TTL, -2 nếu key không tồn tại
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }


  private getUserCacheKey(userId: string): string {
    return `user:profile:${userId}`;
  }

  async getUserCache<T>(userId: string): Promise<T | null> {
    const data = await this.get(this.getUserCacheKey(userId));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setUserCache<T>(
    userId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.USER_CACHE_TTL;
    await this.set(this.getUserCacheKey(userId), JSON.stringify(data), ttl);
  }

  async invalidateUserCache(userId: string): Promise<void> {
    await this.del(this.getUserCacheKey(userId));
  }

  async invalidateAllUserCache(userId: string): Promise<void> {
    await this.delByPattern(`user:*:${userId}`);
  }

  private getUserPermissionCacheKey(userId: string): string {
    return `user:permissions:${userId}`;
  }

  async getUserPermissionsCache(userId: string): Promise<string[] | null> {
    const data = await this.get(this.getUserPermissionCacheKey(userId));
    if (!data) return null;

    try {
      return JSON.parse(data) as string[];
    } catch {
      return null;
    }
  }

  async setUserPermissionsCache(
    userId: string,
    permissions: string[],
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.PERMISSION_CACHE_TTL;
    await this.set(
      this.getUserPermissionCacheKey(userId),
      JSON.stringify(permissions),
      ttl,
    );
  }

  async invalidateUserPermissionsCache(userId: string): Promise<void> {
    await this.del(this.getUserPermissionCacheKey(userId));
  }

  private getWarehouseTemplateCacheKey(templateId: string): string {
    return `warehouse-template:${templateId}`;
  }

  getWarehouseTemplateListCacheKey(query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `warehouse-template:list:${sortedParams}`;
  }

  async getWarehouseTemplateCache<T>(templateId: string): Promise<T | null> {
    const data = await this.get(this.getWarehouseTemplateCacheKey(templateId));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setWarehouseTemplateCache<T>(
    templateId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.WAREHOUSE_TEMPLATE_CACHE_TTL;
    await this.set(this.getWarehouseTemplateCacheKey(templateId), JSON.stringify(data), ttl);
  }

  async invalidateWarehouseTemplateCache(templateId: string): Promise<void> {
    await this.del(this.getWarehouseTemplateCacheKey(templateId));
  }

  async getWarehouseTemplateListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setWarehouseTemplateListCache<T>(cacheKey: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.WAREHOUSE_TEMPLATE_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateWarehouseTemplateListCache(): Promise<void> {
    await this.delByPattern('warehouse-template:list:*');
  }

  private getOrganizationCacheKey(orgId: string): string {
    return `organization:${orgId}`;
  }

  getOrganizationListCacheKey(query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `organization:list:${sortedParams}`;
  }

  private getOrganizationMemberCacheKey(orgId: string): string {
    return `organization:${orgId}:members`;
  }

  async getOrganizationCache<T>(orgId: string): Promise<T | null> {
    const data = await this.get(this.getOrganizationCacheKey(orgId));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setOrganizationCache<T>(
    orgId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ORGANIZATION_CACHE_TTL;
    await this.set(this.getOrganizationCacheKey(orgId), JSON.stringify(data), ttl);
  }

  async invalidateOrganizationCache(orgId: string): Promise<void> {
    await this.del(this.getOrganizationCacheKey(orgId));
  }

  async getOrganizationListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setOrganizationListCache<T>(cacheKey: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.ORGANIZATION_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateOrganizationListCache(): Promise<void> {
    await this.delByPattern('organization:list:*');
  }

  async getOrganizationMemberCache<T>(orgId: string): Promise<T | null> {
    const data = await this.get(this.getOrganizationMemberCacheKey(orgId));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setOrganizationMemberCache<T>(
    orgId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ORGANIZATION_MEMBER_CACHE_TTL;
    await this.set(this.getOrganizationMemberCacheKey(orgId), JSON.stringify(data), ttl);
  }

  async invalidateOrganizationMemberCache(orgId: string): Promise<void> {
    await this.del(this.getOrganizationMemberCacheKey(orgId));
  }

  /** Invalidate tất cả cache liên quan đến organization */
  async invalidateAllOrganizationCache(orgId: string): Promise<void> {
    await Promise.all([
      this.invalidateOrganizationCache(orgId),
      this.invalidateOrganizationMemberCache(orgId),
      this.invalidateOrganizationListCache(),
    ]);
  }

  private readonly GLOBAL_NOTIFICATION_CACHE_TTL: number = 300;
  private readonly GLOBAL_NOTIFICATION_LIST_CACHE_TTL: number = 60;

  private getGlobalNotificationCacheKey(id: string): string {
    return `global-notification:${id}`;
  }

  getGlobalNotificationListCacheKey(query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `global-notification:list:${sortedParams}`;
  }

  async getGlobalNotificationCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getGlobalNotificationCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setGlobalNotificationCache<T>(id: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.GLOBAL_NOTIFICATION_CACHE_TTL;
    await this.set(this.getGlobalNotificationCacheKey(id), JSON.stringify(data), ttl);
  }

  async invalidateGlobalNotificationCache(id: string): Promise<void> {
    await this.del(this.getGlobalNotificationCacheKey(id));
  }

  async getGlobalNotificationListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setGlobalNotificationListCache<T>(cacheKey: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.GLOBAL_NOTIFICATION_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateGlobalNotificationListCache(): Promise<void> {
    await this.delByPattern('global-notification:list:*');
  }

  private readonly USER_NOTIFICATION_CACHE_TTL: number = 300;
  private readonly USER_NOTIFICATION_LIST_CACHE_TTL: number = 60;

  private getUserNotificationCacheKey(id: string): string {
    return `user-notification:${id}`;
  }

  getUserNotificationListCacheKey(userId: string, query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `user-notification:list:${userId}:${sortedParams}`;
  }

  async getUserNotificationCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getUserNotificationCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setUserNotificationCache<T>(id: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.USER_NOTIFICATION_CACHE_TTL;
    await this.set(this.getUserNotificationCacheKey(id), JSON.stringify(data), ttl);
  }

  async invalidateUserNotificationCache(id: string): Promise<void> {
    await this.del(this.getUserNotificationCacheKey(id));
  }

  async getUserNotificationListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setUserNotificationListCache<T>(cacheKey: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.USER_NOTIFICATION_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateUserNotificationListCache(userId: string): Promise<void> {
    await this.delByPattern(`user-notification:list:${userId}:*`);
  }

  private readonly ORG_NOTIFICATION_CACHE_TTL: number = 300;
  private readonly ORG_NOTIFICATION_LIST_CACHE_TTL: number = 60;

  private getOrgNotificationCacheKey(id: string): string {
    return `org-notification:${id}`;
  }

  getOrgNotificationListCacheKey(orgId: string, query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `org-notification:list:${orgId}:${sortedParams}`;
  }

  async getOrgNotificationCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getOrgNotificationCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setOrgNotificationCache<T>(id: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.ORG_NOTIFICATION_CACHE_TTL;
    await this.set(this.getOrgNotificationCacheKey(id), JSON.stringify(data), ttl);
  }

  async invalidateOrgNotificationCache(id: string): Promise<void> {
    await this.del(this.getOrgNotificationCacheKey(id));
  }

  async getOrgNotificationListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setOrgNotificationListCache<T>(cacheKey: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.ORG_NOTIFICATION_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateOrgNotificationListCache(orgId: string): Promise<void> {
    await this.delByPattern(`org-notification:list:${orgId}:*`);
  }

  private readonly ORG_CHAT_MESSAGE_LIST_CACHE_TTL: number = 60;

  getOrgChatMessageListCacheKey(orgId: string, query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `org-chat:messages:${orgId}:${sortedParams}`;
  }

  async getOrgChatMessageListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setOrgChatMessageListCache<T>(cacheKey: string, data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.ORG_CHAT_MESSAGE_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateOrgChatMessageListCache(orgId: string): Promise<void> {
    await this.delByPattern(`org-chat:messages:${orgId}:*`);
  }
}
