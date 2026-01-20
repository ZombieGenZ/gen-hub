import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import * as path from 'path';
import { RedisService } from '../../modules/redis/redis.service';

export interface IAppColors {
  // Primary Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Neutral / Greys
  gray900: string;
  gray700: string;
  gray500: string;
  gray300: string;
  gray100: string;

  // Background & Surface
  background: string;
  cardSurface: string;
  sidebarBg: string;

  // Accent Colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Border + Shadow
  border: string;
  shadow: string;
}

export interface IPaginationConfig {
  /** Số lượng record mặc định mỗi trang */
  defaultLimit: number;
  /** Vị trí bắt đầu mặc định */
  defaultOffset: number;
  /** Số lượng record tối đa cho phép mỗi trang */
  maxLimit: number;
  /** Số lượng record tối thiểu mỗi trang */
  minLimit: number;
}

export interface IAppConfig {
  brandName: string;
  supportEmail: string;
  supportPhone: string;
  colors: IAppColors;
  pagination: IPaginationConfig;
  /** Bật/tắt tự động phản hồi bằng AI cho contact (giá trị mặc định) */
  enableAiAutoReply: boolean;
}

/** Cache key for app config in Redis */
const APP_CONFIG_CACHE_KEY = 'app:config';

/**
 * Service quản lý cấu hình động
 * Sử dụng Cache Aside pattern: Redis → Memory → File
 * - Redis cache cho distributed caching (multi-instance)
 * - Memory cache cho fast access
 * - File persistence cho durability
 */
@Injectable()
export class AppConfigService implements OnModuleInit {
  private readonly logger = new Logger(AppConfigService.name);
  private configCache: IAppConfig;
  private readonly configPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.configPath = path.resolve(process.cwd(), 'app-config.json');
    this.configCache = this.getDefaultConfig();
  }

  async onModuleInit(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Lấy TTL cho Redis cache từ biến môi trường
   * @returns TTL in seconds
   */
  private getCacheTtl(): number {
    return this.configService.get<number>('REDIS_APP_CONFIG_CACHE_TTL') || 300;
  }

  private getDefaultConfig(): IAppConfig {
    return {
      brandName:
        this.configService.get<string>('BRAND_NAME') || 'GEN-HUB',
      supportEmail:
        this.configService.get<string>('SUPPORT_EMAIL') || 'support@gen-hub.com',
      supportPhone:
        this.configService.get<string>('SUPPORT_PHONE') || '1900-xxxx',
      colors: {
        // Primary Colors
        primary: this.configService.get<string>('COLOR_PRIMARY') || '#0F766E',
        primaryLight:
          this.configService.get<string>('COLOR_PRIMARY_LIGHT') || '#14B8A6',
        primaryDark:
          this.configService.get<string>('COLOR_PRIMARY_DARK') || '#0D5A52',

        // Neutral / Greys
        gray900:
          this.configService.get<string>('COLOR_GRAY_900') || '#1E293B',
        gray700:
          this.configService.get<string>('COLOR_GRAY_700') || '#334155',
        gray500:
          this.configService.get<string>('COLOR_GRAY_500') || '#64748B',
        gray300:
          this.configService.get<string>('COLOR_GRAY_300') || '#CBD5E1',
        gray100:
          this.configService.get<string>('COLOR_GRAY_100') || '#F1F5F9',

        // Background & Surface
        background:
          this.configService.get<string>('COLOR_BACKGROUND') || '#F8FAFC',
        cardSurface:
          this.configService.get<string>('COLOR_CARD_SURFACE') || '#FFFFFF',
        sidebarBg:
          this.configService.get<string>('COLOR_SIDEBAR_BG') || '#F1F5F9',

        // Accent Colors
        success:
          this.configService.get<string>('COLOR_SUCCESS') || '#10B981',
        warning:
          this.configService.get<string>('COLOR_WARNING') || '#F59E0B',
        error: this.configService.get<string>('COLOR_ERROR') || '#EF4444',
        info: this.configService.get<string>('COLOR_INFO') || '#0EA5E9',

        // Border + Shadow
        border: this.configService.get<string>('COLOR_BORDER') || '#E2E8F0',
        shadow:
          this.configService.get<string>('COLOR_SHADOW') ||
          'rgba(0, 0, 0, 0.04)',
      },
      pagination: {
        defaultLimit: this.configService.get<number>('DEFAULT_LIMIT') || 10,
        defaultOffset: this.configService.get<number>('DEFAULT_OFFSET') || 0,
        maxLimit: this.configService.get<number>('MAX_LIMIT') || 100,
        minLimit: this.configService.get<number>('MIN_LIMIT') || 1,
      },
      enableAiAutoReply:
        this.configService.get<boolean>('ENABLE_AI_AUTO_REPLY') ?? true,
    };
  }

  /**
   * Load config với Cache Aside pattern
   * 1. Check Redis cache first
   * 2. If miss, load from file
   * 3. Update Redis cache with TTL from .env
   */
  private async loadConfig(): Promise<void> {
    try {
      // 1. Check Redis cache first (Cache Aside - Read)
      const cachedData = await this.redisService.get(APP_CONFIG_CACHE_KEY);
      if (cachedData) {
        this.configCache = JSON.parse(cachedData) as IAppConfig;
        this.logger.debug('Config loaded from Redis cache');
        return;
      }

      // 2. Cache miss - Load from file (async)
      if (existsSync(this.configPath)) {
        const fileContent = await fs.readFile(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent) as Partial<IAppConfig>;
        this.configCache = { ...this.getDefaultConfig(), ...fileConfig };
        this.logger.debug('Config loaded from file');
      } else {
        // File doesn't exist - create with defaults
        await this.saveConfig(this.configCache);
        this.logger.debug('Config file created with defaults');
      }

      // 3. Update Redis cache with TTL from .env
      await this.updateRedisCache(this.configCache);
    } catch (error) {
      this.logger.error('Error loading config:', error);
    }
  }

  /**
   * Save config to file (async)
   */
  private async saveConfig(config: IAppConfig): Promise<void> {
    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf-8',
      );
    } catch (error) {
      this.logger.error('Error saving config:', error);
      throw error;
    }
  }

  /**
   * Update Redis cache với TTL từ .env
   */
  private async updateRedisCache(config: IAppConfig): Promise<void> {
    const ttl = this.getCacheTtl();
    await this.redisService.set(
      APP_CONFIG_CACHE_KEY,
      JSON.stringify(config),
      ttl,
    );
    this.logger.debug(`Config cached in Redis with TTL: ${ttl}s`);
  }

  /**
   * Invalidate Redis cache
   */
  private async invalidateRedisCache(): Promise<void> {
    await this.redisService.del(APP_CONFIG_CACHE_KEY);
    this.logger.debug('Redis cache invalidated');
  }

  getAll(): IAppConfig {
    return { ...this.configCache };
  }

  get<K extends keyof IAppConfig>(key: K): IAppConfig[K] {
    return this.configCache[key];
  }

  /**
   * Deep merge hai object, tự động merge nested objects
   */
  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };
    for (const key in source) {
      if (source[key] !== undefined) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof target[key] === 'object' &&
          target[key] !== null
        ) {
          // Deep merge nested objects
          result[key] = this.deepMerge(target[key], source[key] as any);
        } else {
          result[key] = source[key] as T[Extract<keyof T, string>];
        }
      }
    }
    return result;
  }

  /**
   * Kiểm tra nhanh xem có thay đổi không (shallow compare)
   */
  private hasChanges(oldConfig: IAppConfig, newConfig: IAppConfig): boolean {
    return JSON.stringify(oldConfig) !== JSON.stringify(newConfig);
  }

  /**
   * Cập nhật config với Cache Aside pattern
   * - Update memory cache ngay lập tức
   * - Update Redis cache với TTL từ .env
   * - Ghi file async (parallel với Redis update)
   */
  async update(updates: Partial<IAppConfig>): Promise<IAppConfig> {
    const newConfig = this.deepMerge(this.configCache, updates);

    // Chỉ update và save nếu có thay đổi thực sự
    if (this.hasChanges(this.configCache, newConfig)) {
      // 1. Update memory cache immediately
      this.configCache = newConfig;

      // 2. Update Redis cache và save file in parallel (Promise.all)
      await Promise.all([
        this.updateRedisCache(this.configCache),
        this.saveConfig(this.configCache).catch((error) => {
          this.logger.error('Failed to persist config:', error);
        }),
      ]);
    }

    return this.getAll();
  }

  /**
   * Reset config về mặc định
   * - Clear memory cache
   * - Update Redis cache
   * - Save to file
   */
  async reset(): Promise<IAppConfig> {
    this.configCache = this.getDefaultConfig();

    // Update Redis và save file in parallel (Promise.all)
    await Promise.all([
      this.updateRedisCache(this.configCache),
      this.saveConfig(this.configCache),
    ]);

    return this.getAll();
  }

  /**
   * Reload config từ file
   * - Invalidate Redis cache
   * - Force load từ file (bypass Redis cache)
   * - Update Redis cache
   */
  async reload(): Promise<IAppConfig> {
    try {
      // 1. Invalidate Redis cache first
      await this.invalidateRedisCache();

      // 2. Force load from file
      if (existsSync(this.configPath)) {
        const fileContent = await fs.readFile(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent) as Partial<IAppConfig>;
        this.configCache = { ...this.getDefaultConfig(), ...fileConfig };
      }

      // 3. Update Redis cache
      await this.updateRedisCache(this.configCache);
    } catch (error) {
      this.logger.error('Error reloading config:', error);
    }

    return this.getAll();
  }
}
