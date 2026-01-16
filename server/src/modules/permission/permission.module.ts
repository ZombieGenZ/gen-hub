import { Module } from '@nestjs/common';
import { PermissionController } from './permission.controller';
import { PermissionService } from './permission.service';
import { PermissionRepository } from './permission.repository';
import { RedisModule } from '../redis/redis.module';

/**
 * Permission Module
 * Quản lý danh sách permissions trong hệ thống
 */
@Module({
    imports: [RedisModule],
    controllers: [PermissionController],
    providers: [PermissionService, PermissionRepository],
    exports: [PermissionService, PermissionRepository],
})
export class PermissionModule { }
