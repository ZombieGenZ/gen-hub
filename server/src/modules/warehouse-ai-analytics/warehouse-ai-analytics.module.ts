import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseAiAnalyticsService } from './warehouse-ai-analytics.service';
import { WarehouseAiAnalyticsController } from './warehouse-ai-analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseAiAnalyticsController],
  providers: [WarehouseAiAnalyticsService],
})
export class WarehouseAiAnalyticsModule {}
