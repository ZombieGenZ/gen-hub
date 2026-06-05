import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BinPackingService } from './bin-packing.service';
import { BinPackingController } from './bin-packing.controller';
import { BinPackingAiService } from './bin-packing-ai.service';

@Module({
  imports: [PrismaModule],
  controllers: [BinPackingController],
  providers: [BinPackingService, BinPackingAiService],
  exports: [BinPackingService],
})
export class BinPackingModule {}
