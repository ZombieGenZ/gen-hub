import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { NotificationModule } from '../notification/notification.module';
import { AiHubModule } from '../ai-hub/ai-hub.module';
import { InventoryAlertService } from './inventory-alert.service';
import { InventoryAlertController } from './inventory-alert.controller';
import { InventoryAlertRepository } from './inventory-alert.repository';

@Module({
  imports: [PrismaModule, RedisModule, WebsocketModule, NotificationModule, AiHubModule],
  controllers: [InventoryAlertController],
  providers: [InventoryAlertService, InventoryAlertRepository],
  exports: [InventoryAlertService],
})
export class InventoryAlertModule {}
