import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { RevenueAnalyticsController } from './revenue-analytics.controller';
import { RevenueAnalyticsService } from './revenue-analytics.service';
import { RevenueAnalyticsRepository } from './revenue-analytics.repository';

@Module({
    imports: [RedisModule],
    controllers: [RevenueAnalyticsController],
    providers: [RevenueAnalyticsService, RevenueAnalyticsRepository],
})
export class RevenueAnalyticsModule { }
