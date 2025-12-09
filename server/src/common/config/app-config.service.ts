import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface IAppConfig {
  appName: string;
  appVersion: string;
  teamName: string;
  copyright: string;
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
      appName: this.configService.get<string>('APP_NAME') || 'GEN-HUB',
      appVersion: this.configService.get<string>('APP_VERSION') || '1.0.0',
      teamName:
        this.configService.get<string>('APP_TEAM_NAME') ||
        'TANK ZENITH GEN Development Team',
      copyright:
        this.configService.get<string>('APP_COPYRIGHT') ||
        '© 2025 TANK ZENITH GEN. All rights reserved.',
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

  /** Cập nhật config - update cache ngay, ghi file async */
  async update(updates: Partial<IAppConfig>): Promise<IAppConfig> {
    this.configCache = { ...this.configCache, ...updates };
    this.saveConfig(this.configCache).catch((error) => {
      console.error('[AppConfigService] Failed to persist config:', error);
    });
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
