import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { BackblazeB2Module } from '../backblaze-b2/backblaze-b2.module';
import { AiHubModule } from '../ai-hub/ai-hub.module';
import { WarehouseLegalDocController } from './warehouse-legal-doc.controller';
import { WarehouseLegalDocService } from './warehouse-legal-doc.service';
import { WarehouseLegalDocProcessor } from './warehouse-legal-doc.processor';

@Module({
  imports: [
    PrismaModule,
    BackblazeB2Module,
    AiHubModule,
    BullModule.registerQueue({ name: 'warehouse-doc-analysis' }),
  ],
  controllers: [WarehouseLegalDocController],
  providers: [WarehouseLegalDocService, WarehouseLegalDocProcessor],
  exports: [WarehouseLegalDocService],
})
export class WarehouseLegalDocModule {}
