import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BinPackingService } from './bin-packing.service';
import { BinPackingController } from './bin-packing.controller';

@Module({
  imports: [PrismaModule],
  controllers: [BinPackingController],
  providers: [BinPackingService],
  exports: [BinPackingService],
})
export class BinPackingModule {}
