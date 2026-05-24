import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RedisModule } from '../redis/redis.module';
import { WarehouseVehicleLogModule } from '../warehouse-vehicle-log/warehouse-vehicle-log.module';
import { AiHubModule } from '../ai-hub/ai-hub.module';
import { GpsService } from './gps.service';
import { GpsController } from './gps.controller';
import { GpsRepository } from './gps.repository';

@Module({
  imports: [PrismaModule, WebsocketModule, RedisModule, WarehouseVehicleLogModule, AiHubModule],
  controllers: [GpsController],
  providers: [GpsService, GpsRepository],
  exports: [GpsService],
})
export class GpsModule {}
