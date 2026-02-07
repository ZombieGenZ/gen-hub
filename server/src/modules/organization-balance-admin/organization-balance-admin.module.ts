import { Module } from '@nestjs/common';
import { OrganizationBalanceAdminController } from './organization-balance-admin.controller';
import { OrganizationBalanceAdminService } from './organization-balance-admin.service';
import { OrganizationBalanceAdminRepository } from './organization-balance-admin.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        SystemLogModule,
    ],
    controllers: [OrganizationBalanceAdminController],
    providers: [OrganizationBalanceAdminService, OrganizationBalanceAdminRepository],
    exports: [OrganizationBalanceAdminService, OrganizationBalanceAdminRepository],
})
export class OrganizationBalanceAdminModule { }
