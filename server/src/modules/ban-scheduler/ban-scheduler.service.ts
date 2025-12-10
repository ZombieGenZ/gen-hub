import {
    Injectable,
    OnModuleInit,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { UserRepository } from '../user/user.repository';
import { RedisService } from '../redis/redis.service';

/**
 * Ban Scheduler Service
 * Tự động gỡ ban cho user khi thời gian ban hết hạn
 *
 * Logic:
 * - Khi server khởi động, kiểm tra tất cả user bị banned
 * - Nếu banned_end <= now: gỡ ban ngay
 * - Nếu banned_end > now: lên lịch timeout để gỡ ban đúng thời điểm
 */
@Injectable()
export class BanSchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(BanSchedulerService.name);

    constructor(
        private readonly userRepository: UserRepository,
        private readonly redisService: RedisService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) { }

    async onModuleInit() {
        this.logger.log('🔄 Initializing ban scheduler...');
        await this.processExistingBans();
    }

    async onModuleDestroy() {
        // Clear all scheduled timeouts when module is destroyed
        const timeouts = this.schedulerRegistry.getTimeouts();
        timeouts.forEach((name) => {
            if (name.startsWith('unban_')) {
                this.schedulerRegistry.deleteTimeout(name);
            }
        });
        this.logger.log('🛑 Ban scheduler cleaned up');
    }

    /**
     * Xử lý tất cả user đang bị banned khi server khởi động
     */
    async processExistingBans(): Promise<void> {
        try {
            const bannedUsers = await this.userRepository.findBannedUsers();

            if (bannedUsers.length === 0) {
                this.logger.log('✅ No banned users found');
                return;
            }

            this.logger.log(`📋 Found ${bannedUsers.length} banned user(s)`);

            const now = new Date();
            this.logger.debug(`🕐 Current time: ${now.toLocaleString('vi-VN')} (${now.toISOString()})`);

            let unbannedCount = 0;
            let scheduledCount = 0;

            for (const user of bannedUsers) {
                if (!user.banned_end) {
                    // Permanent ban - không tự động gỡ
                    this.logger.debug(
                        `⏸️ User ${user.email || user.id} has permanent ban (no banned_end)`,
                    );
                    continue;
                }

                const bannedEnd = new Date(user.banned_end);

                this.logger.debug(
                    `👤 User ${user.email}: banned_end = ${bannedEnd.toLocaleString('vi-VN')} (raw: ${user.banned_end})`
                );

                if (bannedEnd <= now) {
                    // Ban đã hết hạn - gỡ ban ngay
                    await this.unbanUser(user.id, user.email || user.name);
                    unbannedCount++;
                } else {
                    // Ban chưa hết hạn - lên lịch
                    this.scheduleUnban(user.id, bannedEnd, user.email || user.name);
                    scheduledCount++;
                }
            }

            this.logger.log(
                `✅ Processed bans: ${unbannedCount} unbanned immediately, ${scheduledCount} scheduled for future`,
            );
        } catch (error) {
            this.logger.error('❌ Error processing existing bans:', error);
        }
    }

    /**
     * Lên lịch gỡ ban cho user vào thời điểm cụ thể
     * @param userId - ID của user
     * @param bannedEnd - Thời điểm hết ban
     * @param userIdentifier - Email hoặc tên để log
     */
    scheduleUnban(
        userId: string,
        bannedEnd: Date,
        userIdentifier: string,
    ): void {
        const now = new Date();
        const delay = bannedEnd.getTime() - now.getTime();

        if (delay <= 0) {
            // Nếu thời gian đã qua, gỡ ban ngay
            this.unbanUser(userId, userIdentifier);
            return;
        }

        const timeoutName = `unban_${userId}`;

        // Xóa timeout cũ nếu có (trong trường hợp ban được cập nhật)
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại, không cần xử lý
        }

        // Tạo timeout mới
        const timeout = setTimeout(async () => {
            await this.unbanUser(userId, userIdentifier);
            try {
                this.schedulerRegistry.deleteTimeout(timeoutName);
            } catch {
                // Ignore if already deleted
            }
        }, delay);

        this.schedulerRegistry.addTimeout(timeoutName, timeout);

        const unbannedAt = bannedEnd.toLocaleString('vi-VN');
        this.logger.log(
            `⏰ Scheduled unban for user ${userIdentifier} at ${unbannedAt} (in ${Math.round(delay / 1000 / 60)} minutes)`,
        );
    }

    /**
     * Gỡ ban cho user
     * @param userId - ID của user
     * @param userIdentifier - Email hoặc tên để log
     */
    async unbanUser(userId: string, userIdentifier: string): Promise<void> {
        try {
            await this.userRepository.unbanUser(userId);

            // Invalidate cache để đảm bảo user có thể đăng nhập ngay
            await this.redisService.invalidateUserCache(userId);
            await this.redisService.invalidateUserPermissionsCache(userId);

            this.logger.log(`✅ User ${userIdentifier} (${userId}) has been unbanned`);
        } catch (error) {
            this.logger.error(
                `❌ Failed to unban user ${userIdentifier} (${userId}):`,
                error,
            );
        }
    }

    /**
     * Hủy lịch gỡ ban (gọi khi ban được gia hạn hoặc thay đổi)
     * @param userId - ID của user
     */
    cancelScheduledUnban(userId: string): void {
        const timeoutName = `unban_${userId}`;
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
            this.logger.log(`🚫 Cancelled scheduled unban for user ${userId}`);
        } catch {
            // Timeout không tồn tại
        }
    }

    /**
     * Cập nhật lịch gỡ ban (gọi khi thời gian ban thay đổi)
     * @param userId - ID của user
     * @param newBannedEnd - Thời điểm hết ban mới
     * @param userIdentifier - Email hoặc tên để log
     */
    updateScheduledUnban(
        userId: string,
        newBannedEnd: Date,
        userIdentifier: string,
    ): void {
        this.cancelScheduledUnban(userId);
        this.scheduleUnban(userId, newBannedEnd, userIdentifier);
    }
}
