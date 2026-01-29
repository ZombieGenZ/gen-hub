import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseVisitService } from './warehouse-visit.service';
import { WarehouseVisitController } from './warehouse-visit.controller';
import { WarehouseVisitRepository } from './warehouse-visit.repository';

@Module({
    imports: [PrismaModule],
    controllers: [WarehouseVisitController],
    providers: [WarehouseVisitService, WarehouseVisitRepository],
    exports: [WarehouseVisitService],
})
export class WarehouseVisitModule { }
