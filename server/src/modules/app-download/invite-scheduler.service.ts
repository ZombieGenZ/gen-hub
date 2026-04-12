import {
  Injectable,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppDownloadRepository } from './app-download.repository';

@Injectable()
export class InviteSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InviteSchedulerService.name);
  private readonly timeoutPrefix: string;

  constructor(
    private readonly repository: AppDownloadRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly configService: ConfigService,
  ) {
    this.timeoutPrefix =
      this.configService.get<string>('SCHEDULER_INVITE_EXPIRE_PREFIX') ||
      'expire_invite';
  }

  async onModuleInit() {
    await this.processExistingShares();
  }

  async onModuleDestroy() {
    const timeouts = this.schedulerRegistry.getTimeouts();
    timeouts.forEach((name) => {
      if (name.startsWith(this.timeoutPrefix + '_')) {
        this.schedulerRegistry.deleteTimeout(name);
      }
    });
  }

  async processExistingShares(): Promise<void> {
    try {
      // Find shares that have already expired but not deleted yet
      const expiredShares = await this.repository.findExpiredShares();
      for (const share of expiredShares) {
        await this.deactivateShare(share.id, share.token);
      }

      // Find active shares with future expiration
      const activeShares =
        await this.repository.findActiveSharesWithExpiration();
      for (const share of activeShares) {
        if (share.expires_at) {
          this.scheduleExpiration(share.id, share.expires_at, share.token);
        }
      }

      if (expiredShares.length > 0 || activeShares.length > 0) {
        this.logger.log(
          `✅ Invite Scheduler: ${expiredShares.length} deactivated, ${activeShares.length} scheduled`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error processing existing shares:', error);
    }
  }

  scheduleExpiration(shareId: string, expiresAt: Date, token: string): void {
    const now = new Date();
    const delay = expiresAt.getTime() - now.getTime();

    if (delay <= 0) {
      this.deactivateShare(shareId, token);
      return;
    }

    const timeoutName = `${this.timeoutPrefix}_${shareId}`;

    try {
      this.schedulerRegistry.deleteTimeout(timeoutName);
    } catch {
      // Ignore
    }

    const timeout = setTimeout(async () => {
      await this.deactivateShare(shareId, token);
      try {
        this.schedulerRegistry.deleteTimeout(timeoutName);
      } catch {
        // Ignore
      }
    }, delay);

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
  }

  async deactivateShare(shareId: string, token: string): Promise<void> {
    try {
      await this.repository.softDeleteShare(shareId, 'SYSTEM_SCHEDULER');
      this.logger.log(
        `✅ Share token "${token}" (${shareId}) has been deactivated due to expiration`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to deactivate Share "${token}" (${shareId}):`,
        error,
      );
    }
  }

  cancelScheduledExpiration(shareId: string): void {
    const timeoutName = `${this.timeoutPrefix}_${shareId}`;
    try {
      this.schedulerRegistry.deleteTimeout(timeoutName);
    } catch {
      // Ignore
    }
  }
}
