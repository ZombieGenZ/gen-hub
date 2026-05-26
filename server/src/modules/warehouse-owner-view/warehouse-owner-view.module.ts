import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseOwnerViewController } from './warehouse-owner-view.controller';
import { WarehouseOwnerViewService } from './warehouse-owner-view.service';

@Module({
  imports: [PrismaModule],
  controllers: [WarehouseOwnerViewController],
  providers: [WarehouseOwnerViewService],
})
export class WarehouseOwnerViewModule {}
