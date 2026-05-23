import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WarehouseVisitModule } from '../warehouse-visit/warehouse-visit.module';
import { ConsultationRequestModule } from '../consultation-request/consultation-request.module';
import { AiHubModule } from '../ai-hub/ai-hub.module';
import { AiPluginController } from './ai-plugin.controller';
import { WarehouseAiController } from './warehouse-ai.controller';
import { AiPluginService } from './ai-plugin.service';
import { AiPluginRepository } from './ai-plugin.repository';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    WarehouseVisitModule,
    ConsultationRequestModule,
    AiHubModule,
  ],
  controllers: [AiPluginController, WarehouseAiController],
  providers: [AiPluginService, AiPluginRepository],
  exports: [AiPluginService],
})
export class AiPluginModule {}
