import { Module } from '@nestjs/common';
import { BruteForceService } from './brute-force.service';
import { BruteForceGuard } from './brute-force.guard';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * Brute Force Protection Module
 * Bảo vệ hệ thống khỏi tấn công brute force qua rate limiting
 */
@Module({
    imports: [RedisModule, PrismaModule, NotificationModule],
    providers: [BruteForceService, BruteForceGuard],
    exports: [BruteForceService, BruteForceGuard],
})
export class BruteForceModule { }
