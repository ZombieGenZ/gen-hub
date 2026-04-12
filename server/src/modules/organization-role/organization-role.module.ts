import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { OrganizationRoleController } from './organization-role.controller';
import { OrganizationRoleService } from './organization-role.service';
import { OrganizationRoleRepository } from './organization-role.repository';
import { OrganizationRoleCacheKeys } from './constants/cache-keys.helper';

@Module({
  imports: [SharedModule, RedisModule, WebsocketModule, OrganizationModule],
  controllers: [OrganizationRoleController],
  providers: [
    OrganizationRoleService,
    OrganizationRoleRepository,
    OrganizationRoleCacheKeys,
  ],
  exports: [
    OrganizationRoleService,
    OrganizationRoleRepository,
    OrganizationRoleCacheKeys,
  ],
})
export class OrganizationRoleModule {}
