import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsCacheHelper {
    constructor(private configService: ConfigService) { }

    private getPrefix(): string {
        return this.configService.get<string>('REDIS_ANALYTICS_KEY_PREFIX') || 'analytics:cloudflare';
    }

    /**
     * Generate cache key for traffic analytics
     * @param startDate YYYY-MM-DD
     * @param endDate YYYY-MM-DD
     */
    traffic(startDate: string, endDate: string): string {
        const prefix = this.getPrefix();
        return `${prefix}:traffic:${startDate}:${endDate}`;
    }
}
