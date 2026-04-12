import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { CloudflareAnalyticsService } from './cloudflare-analytics.service';
import { RedisModule } from '../redis/redis.module';
import { AnalyticsCacheHelper } from './constants/analytics-cache.helper';

/**
 * Analytics Module
 * Module cho các chức năng analytics và thống kê
 */
@Module({
  imports: [RedisModule],
  controllers: [AnalyticsController],
  providers: [CloudflareAnalyticsService, AnalyticsCacheHelper],
  exports: [CloudflareAnalyticsService],
})
export class AnalyticsModule {}
