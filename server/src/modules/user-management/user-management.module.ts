import { Module, forwardRef } from '@nestjs/common';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { UserManagementRepository } from './user-management.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { WarningCategoryModule } from '../warning-category/warning-category.module';
import { BanSchedulerModule } from '../ban-scheduler/ban-scheduler.module';

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        SystemLogModule,
        forwardRef(() => WebsocketModule),
        WarningCategoryModule,
        BanSchedulerModule,
    ],
    controllers: [UserManagementController],
    providers: [UserManagementService, UserManagementRepository],
    exports: [UserManagementService, UserManagementRepository],
})
export class UserManagementModule { }
