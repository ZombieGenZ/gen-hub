import {
  Injectable,
  OnModuleInit,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BanSchedulerService } from '../ban-scheduler/ban-scheduler.service';
import { WarnPenaltyRepository } from '../warn-penalty/warn-penalty.repository';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { BanDurationUnit } from '@prisma/client';

/**
 * Warn Scheduler Service
 * Tự động gỡ warn khi hết hạn và áp dụng ban khi đạt ngưỡng warn
 *
 * Logic:
 * - Khi server khởi động, kiểm tra tất cả warnings đang active
 * - Nếu expires_at <= now: gỡ warn ngay
 * - Nếu expires_at > now: lên lịch timeout để gỡ warn đúng thời điểm
 * - Khi user bị warn, kiểm tra số lần warn và áp dụng ban nếu cần
 */
@Injectable()
export class WarnSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WarnSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly banSchedulerService: BanSchedulerService,
    private readonly warnPenaltyRepository: WarnPenaltyRepository,
    private readonly websocketGateway: WebsocketGateway,
  ) {}

  async onModuleInit() {
    await this.processExistingWarnings();
  }

  async onModuleDestroy() {
    // Clear all scheduled timeouts when module is destroyed
    const timeouts = this.schedulerRegistry.getTimeouts();
    timeouts.forEach((name) => {
      if (name.startsWith('unwarn_')) {
        this.schedulerRegistry.deleteTimeout(name);
      }
    });
  }

  /**
   * Xử lý tất cả warnings đang active khi server khởi động
   */
  async processExistingWarnings(): Promise<void> {
    try {
      const activeWarnings = await this.prisma.userWarning.findMany({
        where: {
          is_active: true,
          is_deleted: false,
          is_permanent: false,
          expires_at: { not: null },
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });

      if (activeWarnings.length === 0) {
        return;
      }

      const now = new Date();
      let removedCount = 0;
      let scheduledCount = 0;

      for (const warning of activeWarnings) {
        if (!warning.expires_at) continue;

        const expiresAt = new Date(warning.expires_at);

        if (expiresAt <= now) {
          // Warning đã hết hạn - gỡ ngay
          await this.removeWarning(
            warning.id,
            warning.user.email || warning.user.name,
          );
          removedCount++;
        } else {
          // Warning chưa hết hạn - lên lịch
          this.scheduleRemoveWarning(
            warning.id,
            expiresAt,
            warning.user.email || warning.user.name,
          );
          scheduledCount++;
        }
      }

      if (removedCount > 0 || scheduledCount > 0) {
        this.logger.log(
          `✅ Warn scheduler: ${removedCount} removed, ${scheduledCount} scheduled`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error processing existing warnings:', error);
    }
  }

  /**
   * Lên lịch gỡ warn vào thời điểm cụ thể
   */
  scheduleRemoveWarning(
    warningId: string,
    expiresAt: Date,
    userIdentifier: string,
  ): void {
    const now = new Date();
    const delay = expiresAt.getTime() - now.getTime();

    if (delay <= 0) {
      this.removeWarning(warningId, userIdentifier);
      return;
    }

    const timeoutName = `unwarn_${warningId}`;

    // Xóa timeout cũ nếu có
    try {
      this.schedulerRegistry.deleteTimeout(timeoutName);
    } catch {
      // Timeout không tồn tại
    }

    // Tạo timeout mới
    const timeout = setTimeout(async () => {
      await this.removeWarning(warningId, userIdentifier);
      try {
        this.schedulerRegistry.deleteTimeout(timeoutName);
      } catch {
        // Ignore if already deleted
      }
    }, delay);

    this.schedulerRegistry.addTimeout(timeoutName, timeout);
  }

  /**
   * Gỡ warning (set inactive)
   */
  async removeWarning(
    warningId: string,
    userIdentifier: string,
  ): Promise<void> {
    try {
      const warning = await this.prisma.userWarning.update({
        where: { id: warningId },
        data: {
          is_active: false,
          removed_at: new Date(),
          removed_by: null, // Auto-removed by system
        },
        include: { user: { select: { id: true } } },
      });

      this.logger.log(
        `✅ Warning ${warningId} for user ${userIdentifier} has been auto-removed`,
      );

      // Emit websocket event
      this.websocketGateway.emitUserUnwarned(
        warning.user.id,
        warningId,
        'system',
      );
    } catch (error) {
      this.logger.error(`❌ Failed to remove warning ${warningId}:`, error);
    }
  }

  /**
   * Hủy lịch gỡ warn (gọi khi warn được gỡ thủ công)
   */
  cancelScheduledRemove(warningId: string): void {
    const timeoutName = `unwarn_${warningId}`;
    try {
      this.schedulerRegistry.deleteTimeout(timeoutName);
    } catch {
      // Timeout không tồn tại
    }
  }

  /**
   * Tính toán thời điểm kết thúc ban dựa trên duration
   */
  private calculateBanEndDate(value: number, unit: BanDurationUnit): Date {
    const now = new Date();

    switch (unit) {
      case 'SECOND':
        return new Date(now.getTime() + value * 1000);
      case 'MINUTE':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'HOUR':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'DAY':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      case 'WEEK':
        return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
      case 'MONTH':
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() + value);
        return monthDate;
      case 'QUARTER':
        const quarterDate = new Date(now);
        quarterDate.setMonth(quarterDate.getMonth() + value * 3);
        return quarterDate;
      case 'YEAR':
        const yearDate = new Date(now);
        yearDate.setFullYear(yearDate.getFullYear() + value);
        return yearDate;
      default:
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000); // Default: days
    }
  }

  /**
   * Kiểm tra và áp dụng ban dựa trên số lần warn của user
   * Gọi function này sau khi user bị warn
   */
  async checkAndApplyPenalty(
    userId: string,
  ): Promise<{ banned: boolean; bannedEnd?: Date; isPermanent?: boolean }> {
    try {
      // Đếm số lần warn active của user
      const activeWarningCount = await this.prisma.userWarning.count({
        where: {
          user_id: userId,
          is_active: true,
          is_deleted: false,
        },
      });

      // Tìm penalty phù hợp với số lần warn
      const penalty =
        await this.warnPenaltyRepository.findPenaltyForWarnCount(
          activeWarningCount,
        );

      if (!penalty) {
        return { banned: false };
      }

      // Lấy thông tin user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, is_banned: true },
      });

      if (!user || user.is_banned) {
        return { banned: false };
      }

      let bannedEnd: Date | null = null;

      if (penalty.is_permanent_ban) {
        // Ban vĩnh viễn
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            is_banned: true,
            is_ban_from_warn: true,
            banned_end: null,
          },
        });

        this.logger.log(
          `🚫 User ${user.email || user.name} (${userId}) permanently banned due to ${activeWarningCount} warnings`,
        );

        // Emit websocket event
        this.websocketGateway.emitUserBanned(
          userId,
          `Bị ban vĩnh viễn do ${activeWarningCount} lần cảnh báo`,
          true,
          null,
          'system',
        );

        return { banned: true, isPermanent: true };
      } else if (penalty.duration_value && penalty.duration_unit) {
        // Ban tạm thời
        bannedEnd = this.calculateBanEndDate(
          penalty.duration_value,
          penalty.duration_unit,
        );

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            is_banned: true,
            is_ban_from_warn: true,
            banned_end: bannedEnd,
          },
        });

        // Lên lịch unban
        this.banSchedulerService.scheduleUnban(
          userId,
          bannedEnd,
          user.email || user.name,
        );

        this.logger.log(
          `🚫 User ${user.email || user.name} (${userId}) banned until ${bannedEnd.toISOString()} due to ${activeWarningCount} warnings`,
        );

        // Emit websocket event
        this.websocketGateway.emitUserBanned(
          userId,
          `Bị ban đến ${bannedEnd.toLocaleString('vi-VN')} do ${activeWarningCount} lần cảnh báo`,
          false,
          bannedEnd.toISOString(),
          'system',
        );

        // Invalidate cache
        await this.redisService.invalidateUserCache(userId);
        await this.redisService.invalidateUserPermissionsCache(userId);

        return { banned: true, bannedEnd, isPermanent: false };
      }

      return { banned: false };
    } catch (error) {
      this.logger.error(
        `❌ Failed to check/apply penalty for user ${userId}:`,
        error,
      );
      return { banned: false };
    }
  }

  /**
   * Lấy số lần warn active của user
   */
  async getActiveWarningCount(userId: string): Promise<number> {
    return this.prisma.userWarning.count({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
      },
    });
  }
}
