import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { VehicleLogService } from './warehouse-vehicle-log.service';
import { VehicleLogController } from './warehouse-vehicle-log.controller';
import { VehicleLogRepository } from './warehouse-vehicle-log.repository';

@Module({
  imports: [PrismaModule, RedisModule, WebsocketModule],
  controllers: [VehicleLogController],
  providers: [VehicleLogService, VehicleLogRepository],
  exports: [VehicleLogService],
})
export class WarehouseVehicleLogModule {}
