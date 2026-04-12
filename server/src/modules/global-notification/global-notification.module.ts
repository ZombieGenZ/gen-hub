import { Module } from '@nestjs/common';
import { GlobalNotificationController } from './global-notification.controller';
import { GlobalNotificationService } from './global-notification.service';
import { GlobalNotificationRepository } from './global-notification.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
  imports: [SharedModule, RedisModule, WebsocketModule, SystemLogModule],
  controllers: [GlobalNotificationController],
  providers: [GlobalNotificationService, GlobalNotificationRepository],
  exports: [GlobalNotificationService],
})
export class GlobalNotificationModule {}
