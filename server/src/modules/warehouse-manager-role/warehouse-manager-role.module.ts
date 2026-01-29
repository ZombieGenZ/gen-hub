import { Module } from '@nestjs/common';
import { WarehouseManagerRoleService } from './warehouse-manager-role.service';
import { WarehouseManagerRoleController } from './warehouse-manager-role.controller';
import { WarehouseManagerRoleRepository } from './warehouse-manager-role.repository';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [WarehouseManagerRoleController],
    providers: [WarehouseManagerRoleService, WarehouseManagerRoleRepository],
    exports: [WarehouseManagerRoleService],
})
export class WarehouseManagerRoleModule { }
