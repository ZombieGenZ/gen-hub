import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, User } from 'discord.js';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client;
  private readonly enabled: boolean;
  private readonly token: string;
  private readonly notifyUserIds: string[];

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('DISCORD_ENABLED') === 'true';
    this.token = this.configService.get<string>('DISCORD_BOT_TOKEN');
    const userIdsStr = this.configService.get<string>(
      'DISCORD_NOTIFY_USER_IDS',
      '',
    );
    this.notifyUserIds = userIdsStr
      .split(',')
      .filter((id) => id.trim().length > 0);
  }

  async onModuleInit() {
    if (this.enabled && this.token) {
      this.client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
      });

      try {
        await this.client.login(this.token);
        this.logger.log('Discord Bot đã đăng nhập thành công');
      } catch (error: any) {
        this.logger.error(`Discord Bot đăng nhập thất bại: ${error.message}`);
      }
    } else {
      this.logger.warn('Discord Bot đang bị tắt hoặc thiếu Token');
    }
  }

  /**
   * Gửi tin nhắn DM cho các user được chỉ định
   */
  async sendDirectMessage(message: string) {
    if (!this.enabled || !this.client) return;

    for (const userId of this.notifyUserIds) {
      try {
        const user: User = await this.client.users.fetch(userId);
        if (user) {
          await user.send(message);
          this.logger.log(`Đã gửi thông báo Discord cho user ${userId}`);
        }
      } catch (error: any) {
        this.logger.error(`Không thể gửi DM cho user ${userId}: ${error.message}`);
      }
        );
      }
    }
  }

  /**
   * Gửi thông báo khi service bị down
   */
  async notifyDown(type: string, url: string, error?: string) {
    const message = `🚨 **SERVICE DOWN** 🚨\n**Type:** ${type}\n**URL:** ${url}\n**Time:** ${new Date().toLocaleString()}\n${error ? `**Error:** ${error}` : ''}`;
    await this.sendDirectMessage(message);
  }

  /**
   * Gửi thông báo khi service phục hồi
   */
  async notifyRecovery(type: string, url: string) {
    const message = `✅ **SERVICE RECOVERY** ✅\n**Type:** ${type}\n**URL:** ${url}\n**Time:** ${new Date().toLocaleString()}`;
    await this.sendDirectMessage(message);
  }
}
