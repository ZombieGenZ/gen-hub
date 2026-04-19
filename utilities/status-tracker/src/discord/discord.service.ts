import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, User } from 'discord.js';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private client: Client | null = null;
  private readonly enabled: boolean;
  private readonly token: string | undefined;
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
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  async onModuleInit() {
    if (this.enabled && this.token) {
      this.client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
      });

      // Fire-and-forget: không block bootstrap nếu Discord login chậm/thất bại
      this.loginDiscord().catch((error) => {
        this.logger.error(
          `Discord Bot đăng nhập thất bại: ${error.message}`,
        );
        this.client = null;
      });
    } else {
      this.logger.warn('Discord Bot đang bị tắt hoặc thiếu Token');
    }
  }

  private async loginDiscord(): Promise<void> {
    const timeoutMs = 10000; // 10 giây timeout
    const loginPromise = this.client!.login(this.token);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Discord login timeout sau 10 giây')),
        timeoutMs,
      ),
    );

    await Promise.race([loginPromise, timeoutPromise]);
    this.logger.log('Discord Bot đã đăng nhập thành công');
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
