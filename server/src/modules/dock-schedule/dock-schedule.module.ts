import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { DockScheduleService } from './dock-schedule.service';
import { DockScheduleController } from './dock-schedule.controller';
import { DockScheduleRepository } from './dock-schedule.repository';
import { WarehouseVehicleLogModule } from '../warehouse-vehicle-log/warehouse-vehicle-log.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    WebsocketModule,
    forwardRef(() => WarehouseVehicleLogModule),
  ],
  controllers: [DockScheduleController],
  providers: [DockScheduleService, DockScheduleRepository],
  exports: [DockScheduleService],
})
export class DockScheduleModule {}
