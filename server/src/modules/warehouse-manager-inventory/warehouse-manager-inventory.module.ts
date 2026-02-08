import { Module } from '@nestjs/common';
import { WarehouseManagerInventoryController } from './warehouse-manager-inventory.controller';
import { WarehouseManagerInventoryService } from './warehouse-manager-inventory.service';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        OrganizationModule,
    ],
    controllers: [WarehouseManagerInventoryController],
    providers: [WarehouseManagerInventoryService],
    exports: [WarehouseManagerInventoryService],
})
export class WarehouseManagerInventoryModule { }
