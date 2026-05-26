import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseOpsAnalyticsService } from './warehouse-ops-analytics.service';
import { WarehouseOpsAnalyticsController } from './warehouse-ops-analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseOpsAnalyticsController],
  providers: [WarehouseOpsAnalyticsService],
})
export class WarehouseOpsAnalyticsModule {}
