import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WarnSchedulerService } from './warn-scheduler.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { BanSchedulerModule } from '../ban-scheduler/ban-scheduler.module';
import { WarnPenaltyModule } from '../warn-penalty/warn-penalty.module';
import { WebsocketModule } from '../websocket/websocket.module';

/**
 * Warn Scheduler Module
 * Module quản lý việc tự động gỡ warn và áp dụng ban
 *
 * Features:
 * - Tự động gỡ warn khi server khởi động nếu warn đã hết hạn
 * - Lên lịch gỡ warn cho các warn chưa hết hạn
 * - Áp dụng ban tự động khi user đạt ngưỡng số lần warn
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    forwardRef(() => BanSchedulerModule),
    forwardRef(() => WarnPenaltyModule),
    WebsocketModule,
  ],
  providers: [WarnSchedulerService],
  exports: [WarnSchedulerService],
})
export class WarnSchedulerModule {}
