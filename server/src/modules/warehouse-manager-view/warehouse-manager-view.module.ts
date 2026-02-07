import { Module } from '@nestjs/common';
import { WarehouseManagerViewController } from './warehouse-manager-view.controller';
import { WarehouseManagerViewService } from './warehouse-manager-view.service';
import { WarehouseManagerViewRepository } from './warehouse-manager-view.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
    imports: [PrismaModule, ApiKeyVerificationModule],
    controllers: [WarehouseManagerViewController],
    providers: [
        WarehouseManagerViewService,
        WarehouseManagerViewRepository,
    ],
    exports: [WarehouseManagerViewService],
})
export class WarehouseManagerViewModule { }
