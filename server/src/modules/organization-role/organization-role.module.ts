import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { OrganizationRoleController } from './organization-role.controller';
import { OrganizationRoleService } from './organization-role.service';
import { OrganizationRoleRepository } from './organization-role.repository';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        OrganizationModule,
    ],
    controllers: [OrganizationRoleController],
    providers: [
        OrganizationRoleService,
        OrganizationRoleRepository,
    ],
    exports: [
        OrganizationRoleService,
        OrganizationRoleRepository,
    ],
})
export class OrganizationRoleModule { }
