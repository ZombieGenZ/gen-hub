import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BruteForceCacheHelper {
    constructor(private configService: ConfigService) { }

    private getRateLimitPrefix(): string {
        return this.configService.get<string>('REDIS_BRUTE_FORCE_RATE_LIMIT_KEY_PREFIX') || 'rate_limit';
    }

    private getUnlockTokenPrefix(): string {
        return this.configService.get<string>('REDIS_BRUTE_FORCE_UNLOCK_TOKEN_KEY_PREFIX') || 'unlock_token';
    }

    private getLockStatusPrefix(): string {
        return this.configService.get<string>('REDIS_BRUTE_FORCE_LOCK_STATUS_KEY_PREFIX') || 'lock_status';
    }

    rateLimit(email: string, ip: string): string {
        return `${this.getRateLimitPrefix()}:${email.toLowerCase()}:${ip}`;
    }

    rateLimitPattern(email: string): string {
        return `${this.getRateLimitPrefix()}:${email.toLowerCase()}:*`;
    }

    unlockToken(email: string): string {
        return `${this.getUnlockTokenPrefix()}:${email.toLowerCase()}`;
    }

    lockStatus(email: string): string {
        return `${this.getLockStatusPrefix()}:${email.toLowerCase()}`;
    }
}
