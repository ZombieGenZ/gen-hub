import { Module } from '@nestjs/common';
import { UserNotificationController } from './user-notification.controller';
import { UserNotificationService } from './user-notification.service';
import { UserNotificationRepository } from './user-notification.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
  imports: [SharedModule, RedisModule, WebsocketModule, SystemLogModule],
  controllers: [UserNotificationController],
  providers: [UserNotificationService, UserNotificationRepository],
  exports: [UserNotificationService],
})
export class UserNotificationModule {}
