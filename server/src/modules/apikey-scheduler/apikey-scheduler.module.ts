import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ApiKeySchedulerService } from './apikey-scheduler.service';
import { OrganizationModule } from '../organization/organization.module';

/**
 * API Key Scheduler Module
 * Module quản lý việc tự động deactivate API key khi hết hạn
 *
 * Features:
 * - Tự động deactivate API key khi server khởi động nếu đã hết hạn
 * - Lên lịch deactivate cho các API key chưa hết hạn
 */
@Module({
  imports: [ScheduleModule.forRoot(), OrganizationModule],
  providers: [ApiKeySchedulerService],
  exports: [ApiKeySchedulerService],
})
export class ApiKeySchedulerModule {}
