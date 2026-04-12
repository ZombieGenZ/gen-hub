import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { RoleRepository } from './role.repository';
import { RedisModule } from '../redis/redis.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { WebsocketModule } from '../websocket/websocket.module';

/**
 * Role Module
 * Quản lý roles trong hệ thống và gán roles/permissions cho users
 */
@Module({
  imports: [RedisModule, SystemLogModule, WebsocketModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
