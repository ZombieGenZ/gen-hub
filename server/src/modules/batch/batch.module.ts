import { Module } from '@nestjs/common';
import { BatchController } from './batch.controller';
import { BatchService } from './batch.service';
import { BatchRepository } from './batch.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
    imports: [SharedModule, RedisModule, WebsocketModule, OrganizationModule],
    controllers: [BatchController],
    providers: [BatchService, BatchRepository],
    exports: [BatchService, BatchRepository],
})
export class BatchModule { }
