import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseTrustController } from './warehouse-trust.controller';
import { WarehouseTrustService } from './warehouse-trust.service';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseTrustController],
  providers: [WarehouseTrustService],
  exports: [WarehouseTrustService],
})
export class WarehouseTrustModule {}
