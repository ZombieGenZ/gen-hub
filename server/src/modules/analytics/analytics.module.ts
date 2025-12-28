import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { CloudflareAnalyticsService } from './cloudflare-analytics.service';

/**
 * Analytics Module
 * Module cho các chức năng analytics và thống kê
 */
@Module({
    controllers: [AnalyticsController],
    providers: [CloudflareAnalyticsService],
    exports: [CloudflareAnalyticsService],
})
export class AnalyticsModule { }
