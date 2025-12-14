import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { OrganizationModule } from '../organization/organization.module';

import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './warehouse.repository';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        SystemLogModule,
        OrganizationModule,
    ],
    controllers: [WarehouseController],
    providers: [WarehouseService, WarehouseRepository],
    exports: [WarehouseService, WarehouseRepository],
})
export class WarehouseModule { }
