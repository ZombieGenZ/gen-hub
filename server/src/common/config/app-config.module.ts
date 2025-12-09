import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { AppConfigController } from './app-config.controller';

/**
 * Module quản lý cấu hình động
 * @Global() để có thể inject AppConfigService ở bất kỳ đâu
 */
@Global()
@Module({
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
