import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SystemLogService } from './system-log.service';
import { SystemLogController } from './system-log.controller';
import { SystemLogRepository } from './repositories';
import { SystemLogCacheKeysHelper } from './constants';

/**
 * System Log Module
 * Module toàn cục để ghi log các hoạt động hệ thống
 * Đánh dấu @Global() để không cần import lại ở mỗi module
 *
 * REFACTORED:
 * - Added Repository for database operations
 * - Added CacheKeysHelper for centralized cache key management
 * - Imported ConfigModule for environment variables
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [SystemLogController],
  providers: [
    SystemLogService,
    SystemLogRepository,
    SystemLogCacheKeysHelper,
  ],
  exports: [SystemLogService, SystemLogCacheKeysHelper],
})
export class SystemLogModule { }
