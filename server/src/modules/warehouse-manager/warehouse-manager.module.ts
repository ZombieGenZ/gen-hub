import { Module } from '@nestjs/common';
import { WarehouseManagerService } from './warehouse-manager.service';
import { WarehouseManagerController } from './warehouse-manager.controller';
import { WarehouseManagerRepository } from './warehouse-manager.repository';
import { WarehouseManagerViewController } from './warehouse-manager-view.controller';
import { WarehouseManagerViewService } from './warehouse-manager-view.service';
import { WarehouseManagerViewRepository } from './warehouse-manager-view.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WarehouseManagerController, WarehouseManagerViewController],
    providers: [
        WarehouseManagerService,
        WarehouseManagerRepository,
        WarehouseManagerViewService,
        WarehouseManagerViewRepository,
    ],
    exports: [WarehouseManagerService, WarehouseManagerViewService],
})
export class WarehouseManagerModule { }

