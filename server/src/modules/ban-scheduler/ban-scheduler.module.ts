import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BanSchedulerService } from './ban-scheduler.service';
import { UserModule } from '../user/user.module';

/**
 * Ban Scheduler Module
 * Module quản lý việc tự động gỡ ban cho user
 *
 * Features:
 * - Tự động gỡ ban khi server khởi động nếu ban đã hết hạn
 * - Lên lịch gỡ ban cho các ban chưa hết hạn
 */
@Module({
    imports: [ScheduleModule.forRoot(), UserModule],
    providers: [BanSchedulerService],
    exports: [BanSchedulerService],
})
export class BanSchedulerModule { }
