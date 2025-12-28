import {
    Injectable,
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { BruteForceService } from './brute-force.service';

/**
 * Brute Force Guard
 * Chặn request trước khi vào logic login/2FA nếu IP+email bị rate limit
 */
@Injectable()
export class BruteForceGuard implements CanActivate {
    constructor(
        private readonly bruteForceService: BruteForceService,
        private readonly i18n: I18nService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        // Lấy email từ body
        const email = request.body?.email;
        if (!email) {
            return true; // Không có email, bỏ qua guard
        }

        // Lấy IP từ request
        const ip = this.getClientIP(request);

        // Kiểm tra IP whitelist
        if (this.bruteForceService.isIPWhitelisted(ip)) {
            return true;
        }

        // Kiểm tra trạng thái khóa
        const lockInfo = await this.bruteForceService.isLocked(email, ip);

        if (lockInfo.locked) {
            // Lấy language từ header
            const lang = request.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'vi';

            // Kiểm tra xem có thể tạo mã unlock mới không
            const canRegenerate = await this.bruteForceService.canRegenerateUnlockCode(email);
            if (canRegenerate) {
                // Tạo mã unlock mới
                const newCode = await this.bruteForceService.generateAndSendUnlockCode(email, ip);

                throw new HttpException({
                    statusCode: HttpStatus.LOCKED,
                    message: await this.i18n.t('bruteForce.lockedWithNewCode', {
                        lang,
                        args: { code: newCode },
                    }),
                    error: 'Locked',
                    unlockCode: newCode,
                    type: lockInfo.type,
                    remainingSeconds: lockInfo.remainingSeconds,
                }, HttpStatus.LOCKED);
            }

            // Trả về lỗi 423 Locked
            const message = await this.bruteForceService.getLockedMessage(lockInfo, lang);

            throw new HttpException({
                statusCode: HttpStatus.LOCKED,
                message,
                error: 'Locked',
                type: lockInfo.type,
                remainingSeconds: lockInfo.remainingSeconds,
            }, HttpStatus.LOCKED);
        }

        return true;
    }

    /**
     * Lấy IP thực từ request (hỗ trợ proxy)
     */
    private getClientIP(request: any): string {
        const xForwardedFor = request.headers['x-forwarded-for'];
        if (xForwardedFor) {
            // x-forwarded-for có thể chứa nhiều IP, lấy IP đầu tiên
            return xForwardedFor.split(',')[0].trim();
        }

        const xRealIP = request.headers['x-real-ip'];
        if (xRealIP) {
            return xRealIP;
        }

        return request.ip || request.connection?.remoteAddress || 'unknown';
    }
}
