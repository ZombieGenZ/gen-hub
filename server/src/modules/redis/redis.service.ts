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
  private readonly WAREHOUSE_MANAGER_CACHE_TTL: number;

  // Account Module Cache Config
  private readonly ACCOUNT_PROFILE_CACHE_TTL: number;
  private readonly ACCOUNT_FULL_DATA_CACHE_TTL: number;
  private readonly ACCOUNT_PROFILE_KEY_PREFIX: string;
  private readonly ACCOUNT_FULL_DATA_KEY_PREFIX: string;

  constructor(private readonly configService: ConfigService) {
    this.USER_CACHE_TTL =
      this.configService.get<number>('REDIS_USER_CACHE_TTL') || 300;
    this.PERMISSION_CACHE_TTL =
      this.configService.get<number>('REDIS_PERMISSION_CACHE_TTL') || 300;
    this.WAREHOUSE_TEMPLATE_CACHE_TTL =
      this.configService.get<number>('REDIS_WAREHOUSE_TEMPLATE_CACHE_TTL') ||
      300;
    this.WAREHOUSE_TEMPLATE_LIST_CACHE_TTL =
      this.configService.get<number>(
        'REDIS_WAREHOUSE_TEMPLATE_LIST_CACHE_TTL',
      ) || 60;
    this.ORGANIZATION_CACHE_TTL =
      this.configService.get<number>('REDIS_ORGANIZATION_CACHE_TTL') || 300;
    this.ORGANIZATION_LIST_CACHE_TTL =
      this.configService.get<number>('REDIS_ORGANIZATION_LIST_CACHE_TTL') || 60;
    this.ORGANIZATION_MEMBER_CACHE_TTL =
      this.configService.get<number>('REDIS_ORGANIZATION_MEMBER_CACHE_TTL') ||
      300;
    this.WAREHOUSE_MANAGER_CACHE_TTL =
      this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_CACHE_TTL') ||
      300;

    // Account Module Cache Config from env
    this.ACCOUNT_PROFILE_CACHE_TTL =
      this.configService.get<number>('REDIS_ACCOUNT_PROFILE_CACHE_TTL') || 300;
    this.ACCOUNT_FULL_DATA_CACHE_TTL =
      this.configService.get<number>('REDIS_ACCOUNT_FULL_DATA_CACHE_TTL') ||
      180;
    this.ACCOUNT_PROFILE_KEY_PREFIX =
      this.configService.get<string>('REDIS_ACCOUNT_PROFILE_KEY_PREFIX') ||
      'account:profile';
    this.ACCOUNT_FULL_DATA_KEY_PREFIX =
      this.configService.get<string>('REDIS_ACCOUNT_FULL_DATA_KEY_PREFIX') ||
      'account:fulldata';

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

  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.client.setex(key, ttlSeconds, JSON.stringify(value));
    }
    return this.client.set(key, JSON.stringify(value));
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
    await this.set(
      this.getWarehouseTemplateCacheKey(templateId),
      JSON.stringify(data),
      ttl,
    );
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

  async setWarehouseTemplateListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
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
    await this.set(
      this.getOrganizationCacheKey(orgId),
      JSON.stringify(data),
      ttl,
    );
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

  async setOrganizationListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
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
    await this.set(
      this.getOrganizationMemberCacheKey(orgId),
      JSON.stringify(data),
      ttl,
    );
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

  async setGlobalNotificationCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.GLOBAL_NOTIFICATION_CACHE_TTL;
    await this.set(
      this.getGlobalNotificationCacheKey(id),
      JSON.stringify(data),
      ttl,
    );
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

  async setGlobalNotificationListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
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

  getUserNotificationListCacheKey(
    userId: string,
    query: Record<string, unknown>,
  ): string {
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

  async setUserNotificationCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.USER_NOTIFICATION_CACHE_TTL;
    await this.set(
      this.getUserNotificationCacheKey(id),
      JSON.stringify(data),
      ttl,
    );
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

  async setUserNotificationListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
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

  getOrgNotificationListCacheKey(
    orgId: string,
    query: Record<string, unknown>,
  ): string {
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

  async setOrgNotificationCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ORG_NOTIFICATION_CACHE_TTL;
    await this.set(
      this.getOrgNotificationCacheKey(id),
      JSON.stringify(data),
      ttl,
    );
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

  async setOrgNotificationListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ORG_NOTIFICATION_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateOrgNotificationListCache(orgId: string): Promise<void> {
    await this.delByPattern(`org-notification:list:${orgId}:*`);
  }

  private readonly ORG_CHAT_MESSAGE_LIST_CACHE_TTL: number = 60;

  getOrgChatMessageListCacheKey(
    orgId: string,
    query: Record<string, unknown>,
  ): string {
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

  async setOrgChatMessageListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ORG_CHAT_MESSAGE_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateOrgChatMessageListCache(orgId: string): Promise<void> {
    await this.delByPattern(`org-chat:messages:${orgId}:*`);
  }

  /**
   * Generate cache key for account profile
   */
  getAccountProfileCacheKey(userId: string): string {
    return `${this.ACCOUNT_PROFILE_KEY_PREFIX}:${userId}`;
  }

  /**
   * Get account profile from cache
   */
  async getAccountProfileCache<T>(userId: string): Promise<T | null> {
    const data = await this.get(this.getAccountProfileCacheKey(userId));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set account profile to cache
   */
  async setAccountProfileCache<T>(
    userId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ACCOUNT_PROFILE_CACHE_TTL;
    await this.set(
      this.getAccountProfileCacheKey(userId),
      JSON.stringify(data),
      ttl,
    );
  }

  /**
   * Invalidate account profile cache
   */
  async invalidateAccountProfileCache(userId: string): Promise<void> {
    await this.del(this.getAccountProfileCacheKey(userId));
  }

  /**
   * Generate cache key for account full data (export)
   */
  getAccountFullDataCacheKey(userId: string): string {
    return `${this.ACCOUNT_FULL_DATA_KEY_PREFIX}:${userId}`;
  }

  /**
   * Get account full data from cache
   */
  async getAccountFullDataCache<T>(userId: string): Promise<T | null> {
    const data = await this.get(this.getAccountFullDataCacheKey(userId));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set account full data to cache
   */
  async setAccountFullDataCache<T>(
    userId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.ACCOUNT_FULL_DATA_CACHE_TTL;
    await this.set(
      this.getAccountFullDataCacheKey(userId),
      JSON.stringify(data),
      ttl,
    );
  }

  /**
   * Invalidate account full data cache
   */
  async invalidateAccountFullDataCache(userId: string): Promise<void> {
    await this.del(this.getAccountFullDataCacheKey(userId));
  }

  /**
   * Invalidate all account caches for a user
   */
  async invalidateAllAccountCache(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateAccountProfileCache(userId),
      this.invalidateAccountFullDataCache(userId),
    ]);
  }

  private get SYSTEM_LOG_LIST_CACHE_TTL(): number {
    return (
      this.configService.get<number>('REDIS_SYSTEM_LOG_LIST_CACHE_TTL') || 30
    );
  }

  private get SYSTEM_LOG_STATS_CACHE_TTL(): number {
    return (
      this.configService.get<number>('REDIS_SYSTEM_LOG_STATS_CACHE_TTL') || 60
    );
  }

  private get SYSTEM_LOG_MODULES_CACHE_TTL(): number {
    return (
      this.configService.get<number>('REDIS_SYSTEM_LOG_MODULES_CACHE_TTL') ||
      300
    );
  }

  private get SYSTEM_LOG_LIST_KEY_PREFIX(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_LIST_KEY_PREFIX') ||
      'system:log:list'
    );
  }

  private get SYSTEM_LOG_STATS_KEY_PREFIX(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_STATS_KEY_PREFIX') ||
      'system:log:stats'
    );
  }

  private readonly TWO_FACTOR_SETUP_CACHE_TTL: number;
  private readonly TWO_FACTOR_TEMP_TOKEN_CACHE_TTL: number;

  private get TWO_FACTOR_SETUP_KEY_PREFIX(): string {
    return (
      this.configService.get<string>('REDIS_TWO_FACTOR_SETUP_KEY_PREFIX') ||
      '2fa:setup'
    );
  }

  /*
   * Initialize 2FA cache config in constructor (add this logic inside constructor)
   * Note: Since I cannot edit constructor directly here easily without replacing the whole class,
   * I will rely on the properties being initialized with default values or read directly in methods if needed.
   * However, best practice is to read in constructor.
   * Let's add the methods first.
   */

  /**
   * Generate cache key for 2FA setup session
   */
  getTwoFactorSetupCacheKey(userId: string): string {
    return `${this.TWO_FACTOR_SETUP_KEY_PREFIX}:${userId}`;
  }

  /**
   * Get 2FA setup session from cache
   */
  async getTwoFactorSetupCache<T>(userId: string): Promise<T | null> {
    const data = await this.get(this.getTwoFactorSetupCacheKey(userId));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set 2FA setup session to cache
   */
  async setTwoFactorSetupCache<T>(
    userId: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl =
      ttlSeconds ||
      this.configService.get<number>('REDIS_TWO_FACTOR_SETUP_CACHE_TTL') ||
      300;
    await this.set(
      this.getTwoFactorSetupCacheKey(userId),
      JSON.stringify(data),
      ttl,
    );
  }

  /**
   * Invalidate 2FA setup session cache
   */
  async invalidateTwoFactorSetupCache(userId: string): Promise<void> {
    await this.del(this.getTwoFactorSetupCacheKey(userId));
  }

  private get SYSTEM_LOG_MODULES_KEY_PREFIX(): string {
    return (
      this.configService.get<string>('REDIS_SYSTEM_LOG_MODULES_KEY_PREFIX') ||
      'system:log:modules'
    );
  }

  /**
   * Generate cache key for system log list with query params
   */
  getSystemLogListCacheKey(query: Record<string, unknown>): string {
    const sortedParams = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');
    return `${this.SYSTEM_LOG_LIST_KEY_PREFIX}:${sortedParams}`;
  }

  /**
   * Get system log list from cache
   */
  async getSystemLogListCache<T>(cacheKey: string): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set system log list to cache
   */
  async setSystemLogListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.SYSTEM_LOG_LIST_CACHE_TTL;
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  /**
   * Invalidate all system log list cache
   */
  async invalidateSystemLogListCache(): Promise<void> {
    await this.delByPattern(`${this.SYSTEM_LOG_LIST_KEY_PREFIX}:*`);
  }

  /**
   * Get system log stats cache key
   */
  getSystemLogStatsCacheKey(): string {
    return this.SYSTEM_LOG_STATS_KEY_PREFIX;
  }

  /**
   * Get system log stats from cache
   */
  async getSystemLogStatsCache<T>(): Promise<T | null> {
    const data = await this.get(this.SYSTEM_LOG_STATS_KEY_PREFIX);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set system log stats to cache
   */
  async setSystemLogStatsCache<T>(data: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.SYSTEM_LOG_STATS_CACHE_TTL;
    await this.set(this.SYSTEM_LOG_STATS_KEY_PREFIX, JSON.stringify(data), ttl);
  }

  /**
   * Invalidate system log stats cache
   */
  async invalidateSystemLogStatsCache(): Promise<void> {
    await this.del(this.SYSTEM_LOG_STATS_KEY_PREFIX);
  }

  /**
   * Get system log modules cache key
   */
  getSystemLogModulesCacheKey(): string {
    return this.SYSTEM_LOG_MODULES_KEY_PREFIX;
  }

  /**
   * Get system log modules from cache
   */
  async getSystemLogModulesCache(): Promise<string[] | null> {
    const data = await this.get(this.SYSTEM_LOG_MODULES_KEY_PREFIX);
    if (!data) return null;
    try {
      return JSON.parse(data) as string[];
    } catch {
      return null;
    }
  }

  /**
   * Set system log modules to cache
   */
  async setSystemLogModulesCache(
    modules: string[],
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl = ttlSeconds || this.SYSTEM_LOG_MODULES_CACHE_TTL;
    await this.set(
      this.SYSTEM_LOG_MODULES_KEY_PREFIX,
      JSON.stringify(modules),
      ttl,
    );
  }

  /**
   * Invalidate system log modules cache
   */
  async invalidateSystemLogModulesCache(): Promise<void> {
    await this.del(this.SYSTEM_LOG_MODULES_KEY_PREFIX);
  }

  /**
   * Invalidate all system log caches
   */
  async invalidateAllSystemLogCache(): Promise<void> {
    await Promise.all([
      this.invalidateSystemLogListCache(),
      this.invalidateSystemLogStatsCache(),
      this.invalidateSystemLogModulesCache(),
    ]);
  }

  // Warehouse Manager Cache Helpers
  getWarehouseManagerCacheKey(id: string): string {
    const prefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_KEY_PREFIX',
      'warehouse:manager',
    );
    return `${prefix}:${id}`;
  }

  getWarehouseManagerListCacheKey(query: Record<string, unknown>): string {
    const prefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_LIST_KEY_PREFIX',
      'warehouse:manager:list',
    );
    return `${prefix}:${JSON.stringify(query)}`;
  }

  async getWarehouseManagerCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getWarehouseManagerCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setWarehouseManagerCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl =
      ttlSeconds ||
      this.configService.get<number>('REDIS_WAREHOUSE_MANAGER_CACHE_TTL', 300);
    await this.set(
      this.getWarehouseManagerCacheKey(id),
      JSON.stringify(data),
      ttl,
    );
  }

  async invalidateWarehouseManagerCache(id: string): Promise<void> {
    await this.del(this.getWarehouseManagerCacheKey(id));
    // Also invalidate list cache
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_LIST_KEY_PREFIX',
      'warehouse:manager:list',
    );
    await this.delByPattern(`${listPrefix}:*`);
  }

  // Warehouse Manager Role Cache Helpers
  getWarehouseManagerRoleCacheKey(id: string): string {
    const prefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_ROLE_KEY_PREFIX',
      'warehouse:manager:role',
    );
    return `${prefix}:${id}`;
  }

  getWarehouseManagerRoleListCacheKey(query: Record<string, unknown>): string {
    const prefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_ROLE_LIST_KEY_PREFIX',
      'warehouse:manager:role:list',
    );
    return `${prefix}:${JSON.stringify(query)}`;
  }

  getWarehouseManagerPermissionCacheKey(): string {
    return this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_PERMISSION_KEY_PREFIX',
      'warehouse:manager:permission',
    );
  }

  async getWarehouseManagerRoleCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getWarehouseManagerRoleCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setWarehouseManagerRoleCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const key = this.getWarehouseManagerRoleCacheKey(id);
    const ttl =
      ttlSeconds ||
      this.configService.get<number>(
        'REDIS_WAREHOUSE_MANAGER_ROLE_CACHE_TTL',
        300,
      );
    await this.set(key, JSON.stringify(data), ttl);
  }

  async invalidateWarehouseManagerRoleCache(id: string): Promise<void> {
    const key = this.getWarehouseManagerRoleCacheKey(id);
    await this.del(key);
    // Also invalidate list cache
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_MANAGER_ROLE_LIST_KEY_PREFIX',
      'warehouse:manager:role:list',
    );
    await this.delByPattern(`${listPrefix}:*`);
  }

  // Warehouse Visit Cache Helpers
  getWarehouseVisitCacheKey(id: string): string {
    const prefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_VISIT_KEY_PREFIX',
      'warehouse:visit',
    );
    return `${prefix}:${id}`;
  }

  getWarehouseVisitListCacheKey(query: Record<string, unknown>): string {
    const prefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX',
      'warehouse:visit:list',
    );
    return `${prefix}:${JSON.stringify(query)}`;
  }

  async getWarehouseVisitCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getWarehouseVisitCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setWarehouseVisitCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const key = this.getWarehouseVisitCacheKey(id);
    const ttl =
      ttlSeconds ||
      this.configService.get<number>('REDIS_WAREHOUSE_VISIT_CACHE_TTL', 300);
    await this.set(key, JSON.stringify(data), ttl);
  }

  async invalidateWarehouseVisitCache(id: string): Promise<void> {
    const key = this.getWarehouseVisitCacheKey(id);
    await this.del(key);
    // Also invalidate list cache
    const listPrefix = this.configService.get<string>(
      'REDIS_WAREHOUSE_VISIT_LIST_KEY_PREFIX',
      'warehouse:visit:list',
    );
    await this.delByPattern(`${listPrefix}:*`);
  }

  getConsultationRequestCacheKey(id: string): string {
    const prefix = this.configService.get<string>(
      'REDIS_CONSULTATION_REQUEST_KEY_PREFIX',
      'consultation-request',
    );
    return `${prefix}:${id}`;
  }

  getConsultationRequestListCacheKey(query: Record<string, unknown>): string {
    const prefix = this.configService.get<string>(
      'REDIS_CONSULTATION_REQUEST_LIST_KEY_PREFIX',
      'consultation-request:list',
    );
    return `${prefix}:${JSON.stringify(query)}`;
  }

  async getConsultationRequestCache<T>(id: string): Promise<T | null> {
    const data = await this.get(this.getConsultationRequestCacheKey(id));
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setConsultationRequestCache<T>(
    id: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl =
      ttlSeconds ||
      this.configService.get<number>(
        'REDIS_CONSULTATION_REQUEST_CACHE_TTL',
        300,
      );
    await this.set(
      this.getConsultationRequestCacheKey(id),
      JSON.stringify(data),
      ttl,
    );
  }

  async invalidateConsultationRequestCache(id: string): Promise<void> {
    await this.del(this.getConsultationRequestCacheKey(id));
    await this.invalidateConsultationRequestListCache();
  }

  async getConsultationRequestListCache<T>(
    cacheKey: string,
  ): Promise<T | null> {
    const data = await this.get(cacheKey);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async setConsultationRequestListCache<T>(
    cacheKey: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    const ttl =
      ttlSeconds ||
      this.configService.get<number>(
        'REDIS_CONSULTATION_REQUEST_LIST_CACHE_TTL',
        60,
      );
    await this.set(cacheKey, JSON.stringify(data), ttl);
  }

  async invalidateConsultationRequestListCache(): Promise<void> {
    const prefix = this.configService.get<string>(
      'REDIS_CONSULTATION_REQUEST_LIST_KEY_PREFIX',
      'consultation-request:list',
    );
    await this.delByPattern(`${prefix}:*`);
  }
}
