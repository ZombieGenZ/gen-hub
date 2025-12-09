import { Global, Module } from '@nestjs/common';
import { SystemLogService } from './system-log.service';

/**
 * System Log Module
 * Module toàn cục để ghi log các hoạt động hệ thống
 * Đánh dấu @Global() để không cần import lại ở mỗi module
 */
@Global()
@Module({
  providers: [SystemLogService],
  exports: [SystemLogService],
})
export class SystemLogModule {}
