import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * Service quản lý cấu hình động
 * Config được cache trong memory để tối ưu performance
 */
@Injectable()
export class AppConfigService implements OnModuleInit {
  private configCache: IAppConfig;
  private readonly configPath: string;

  constructor(private readonly configService: ConfigService) {
    this.configPath = path.resolve(process.cwd(), 'app-config.json');
    this.configCache = this.getDefaultConfig();
  }

  async onModuleInit(): Promise<void> {
    await this.loadConfig();
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

  private async loadConfig(): Promise<void> {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent) as Partial<IAppConfig>;
        this.configCache = { ...this.getDefaultConfig(), ...fileConfig };
      } else {
        await this.saveConfig(this.configCache);
      }
    } catch (error) {
      console.error('[AppConfigService] Error loading config:', error);
    }
  }

  private async saveConfig(config: IAppConfig): Promise<void> {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(config, null, 2),
        'utf-8',
      );
    } catch (error) {
      console.error('[AppConfigService] Error saving config:', error);
      throw error;
    }
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

  /** Cập nhật config - update cache ngay, ghi file async chỉ khi có thay đổi */
  async update(updates: Partial<IAppConfig>): Promise<IAppConfig> {
    const newConfig = this.deepMerge(this.configCache, updates);

    // Chỉ update và save nếu có thay đổi thực sự
    if (this.hasChanges(this.configCache, newConfig)) {
      this.configCache = newConfig;
      // Fire-and-forget: không chờ ghi file
      this.saveConfig(this.configCache).catch((error) => {
        console.error('[AppConfigService] Failed to persist config:', error);
      });
    }

    return this.getAll();
  }

  async reset(): Promise<IAppConfig> {
    this.configCache = this.getDefaultConfig();
    await this.saveConfig(this.configCache);
    return this.getAll();
  }

  async reload(): Promise<IAppConfig> {
    await this.loadConfig();
    return this.getAll();
  }
}
