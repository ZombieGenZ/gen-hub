import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SignatureService } from './signature.service';

/**
 * Scheduler xóa chữ ký hết hạn
 * Chạy mỗi giờ để clean up các signatures đã hết hạn
 */
@Injectable()
export class SignatureCleanupScheduler {
    private readonly logger = new Logger(SignatureCleanupScheduler.name);

    constructor(private readonly signatureService: SignatureService) { }

    /**
     * Chạy mỗi giờ để xóa các chữ ký hết hạn
     */
    @Cron(CronExpression.EVERY_HOUR)
    async handleCleanup(): Promise<void> {
        this.logger.log('Starting signature cleanup...');

        try {
            const deletedCount = await this.signatureService.cleanupExpiredSignatures();

            if (deletedCount > 0) {
                this.logger.log(`Cleaned up ${deletedCount} expired signatures`);
            } else {
                this.logger.debug('No expired signatures to cleanup');
            }
        } catch (error) {
            this.logger.error(`Signature cleanup failed: ${error}`);
        }
    }
}
