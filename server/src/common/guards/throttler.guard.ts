import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Guard rate limiting custom để bảo vệ các API nhạy cảm
 * Mở rộng từ ThrottlerGuard của @nestjs/throttler
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
    /**
     * Tạo key cho rate limiting dựa trên IP và route
     * @param context - ExecutionContext
     * @param suffix - Suffix cho key
     * @param throttlerName - Tên của throttler
     * @returns Promise<string> - Key dùng để track rate limit
     */
    protected async getTracker(req: Record<string, unknown>): Promise<string> {
        // Lấy IP từ request, hỗ trợ proxy
        const ip =
            (req.headers as Record<string, string>)['x-forwarded-for']?.split(',')[0] ||
            (req.ip as string) ||
            'unknown';
        return ip;
    }
}
