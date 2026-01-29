import { Module } from '@nestjs/common';
import { WarehouseManagerService } from './warehouse-manager.service';
import { WarehouseManagerController } from './warehouse-manager.controller';
import { WarehouseManagerRepository } from './warehouse-manager.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WarehouseManagerController],
    providers: [WarehouseManagerService, WarehouseManagerRepository],
    exports: [WarehouseManagerService],
})
export class WarehouseManagerModule { }
