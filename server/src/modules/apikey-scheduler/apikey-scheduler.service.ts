import {
    Injectable,
    OnModuleInit,
    Logger,
    OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { OrganizationRepository } from '../organization/organization.repository';

/**
 * API Key Expiry Scheduler Service
 * Tự động deactivate API key khi thời gian hết hạn
 *
 * Logic:
 * - Khi server khởi động, kiểm tra tất cả API key có expires_at
 * - Nếu expires_at <= now: deactivate ngay
 * - Nếu expires_at > now: lên lịch timeout để deactivate đúng thời điểm
 */
@Injectable()
export class ApiKeySchedulerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(ApiKeySchedulerService.name);
    private readonly timeoutPrefix: string;

    constructor(
        private readonly organizationRepository: OrganizationRepository,
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly configService: ConfigService,
    ) {
        this.timeoutPrefix = this.configService.get<string>('SCHEDULER_APIKEY_EXPIRE_PREFIX') || 'expire_apikey';
    }

    async onModuleInit() {
        await this.processExistingApiKeys();
    }

    async onModuleDestroy() {
        // Clear all scheduled timeouts when module is destroyed
        const timeouts = this.schedulerRegistry.getTimeouts();
        timeouts.forEach((name) => {
            if (name.startsWith(this.timeoutPrefix + '_')) {
                this.schedulerRegistry.deleteTimeout(name);
            }
        });
    }

    /**
     * Xử lý tất cả API key có expires_at khi server khởi động
     */
    async processExistingApiKeys(): Promise<void> {
        try {
            const apiKeys = await this.organizationRepository.findActiveApiKeysWithExpiration();

            if (apiKeys.length === 0) {
                return;
            }

            const now = new Date();

            let deactivatedCount = 0;
            let scheduledCount = 0;

            for (const apiKey of apiKeys) {
                if (!apiKey.expires_at) {
                    continue;
                }

                const expiresAt = new Date(apiKey.expires_at);

                if (expiresAt <= now) {
                    // API key đã hết hạn - deactivate ngay
                    await this.deactivateApiKey(apiKey.id, apiKey.name);
                    deactivatedCount++;
                } else {
                    // API key chưa hết hạn - lên lịch
                    this.scheduleExpiration(apiKey.id, expiresAt, apiKey.name);
                    scheduledCount++;
                }
            }

            if (deactivatedCount > 0 || scheduledCount > 0) {
                this.logger.log(
                    `✅ API Key scheduler: ${deactivatedCount} deactivated, ${scheduledCount} scheduled`,
                );
            }
        } catch (error) {
            this.logger.error('❌ Error processing existing API keys:', error);
        }
    }

    /**
     * Lên lịch deactivate API key vào thời điểm cụ thể
     * @param apiKeyId - ID của API key
     * @param expiresAt - Thời điểm hết hạn
     * @param apiKeyName - Tên API key để log
     */
    scheduleExpiration(
        apiKeyId: string,
        expiresAt: Date,
        apiKeyName: string,
    ): void {
        const now = new Date();
        const delay = expiresAt.getTime() - now.getTime();

        if (delay <= 0) {
            // Nếu thời gian đã qua, deactivate ngay
            this.deactivateApiKey(apiKeyId, apiKeyName);
            return;
        }

        const timeoutName = `${this.timeoutPrefix}_${apiKeyId}`;

        // Xóa timeout cũ nếu có (trong trường hợp expires_at được cập nhật)
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại, không cần xử lý
        }

        // Tạo timeout mới
        const timeout = setTimeout(async () => {
            await this.deactivateApiKey(apiKeyId, apiKeyName);
            try {
                this.schedulerRegistry.deleteTimeout(timeoutName);
            } catch {
                // Ignore if already deleted
            }
        }, delay);

        this.schedulerRegistry.addTimeout(timeoutName, timeout);
    }

    /**
     * Deactivate API key
     * @param apiKeyId - ID của API key
     * @param apiKeyName - Tên API key để log
     */
    async deactivateApiKey(apiKeyId: string, apiKeyName: string): Promise<void> {
        try {
            await this.organizationRepository.deactivateApiKey(apiKeyId);

            this.logger.log(`✅ API Key "${apiKeyName}" (${apiKeyId}) has been deactivated due to expiration`);
        } catch (error) {
            this.logger.error(
                `❌ Failed to deactivate API Key "${apiKeyName}" (${apiKeyId}):`,
                error,
            );
        }
    }

    /**
     * Hủy lịch deactivate (gọi khi expires_at được xóa hoặc API key bị xóa)
     * @param apiKeyId - ID của API key
     */
    cancelScheduledExpiration(apiKeyId: string): void {
        const timeoutName = `${this.timeoutPrefix}_${apiKeyId}`;
        try {
            this.schedulerRegistry.deleteTimeout(timeoutName);
        } catch {
            // Timeout không tồn tại
        }
    }

    /**
     * Cập nhật lịch deactivate (gọi khi expires_at thay đổi)
     * @param apiKeyId - ID của API key
     * @param newExpiresAt - Thời điểm hết hạn mới
     * @param apiKeyName - Tên API key để log
     */
    updateScheduledExpiration(
        apiKeyId: string,
        newExpiresAt: Date,
        apiKeyName: string,
    ): void {
        this.cancelScheduledExpiration(apiKeyId);
        this.scheduleExpiration(apiKeyId, newExpiresAt, apiKeyName);
    }
}
