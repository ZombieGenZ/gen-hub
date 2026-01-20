import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';
import { PaginationConfigService } from './pagination-config.service';
import { AppConfigCacheKeys } from './helpers/cache-keys.helper';

/**
 * Module quản lý cấu hình động
 * @Global() để có thể inject AppConfigService ở bất kỳ đâu
 */
@Global()
@Module({
  controllers: [AppConfigController],
  providers: [AppConfigCacheKeys, AppConfigService, PaginationConfigService],
  exports: [AppConfigCacheKeys, AppConfigService, PaginationConfigService],
})
export class AppConfigModule { }


