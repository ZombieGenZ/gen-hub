import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';
import { PaginationConfigService } from './pagination-config.service';

/**
 * Module quản lý cấu hình động
 * @Global() để có thể inject AppConfigService ở bất kỳ đâu
 */
@Global()
@Module({
  controllers: [AppConfigController],
  providers: [AppConfigService, PaginationConfigService],
  exports: [AppConfigService, PaginationConfigService],
})
export class AppConfigModule { }

