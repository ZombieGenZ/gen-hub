import { Module } from '@nestjs/common';
import { UnitController } from './unit.controller';
import { UnitService } from './unit.service';
import { UnitRepository } from './unit.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
    imports: [SharedModule, RedisModule, WebsocketModule, OrganizationModule, ApiKeyVerificationModule],
    controllers: [UnitController],
    providers: [UnitService, UnitRepository],
    exports: [UnitService, UnitRepository],
})
export class UnitModule { }
