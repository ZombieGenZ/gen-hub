import { Module } from '@nestjs/common';
import { WarehouseTemplateController } from './warehouse-template.controller';
import { WarehouseTemplateService } from './warehouse-template.service';
import { WarehouseTemplateRepository } from './warehouse-template.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
    imports: [SharedModule, RedisModule, WebsocketModule, SystemLogModule],
    controllers: [WarehouseTemplateController],
    providers: [WarehouseTemplateService, WarehouseTemplateRepository],
    exports: [WarehouseTemplateService, WarehouseTemplateRepository],
})
export class WarehouseTemplateModule { }
