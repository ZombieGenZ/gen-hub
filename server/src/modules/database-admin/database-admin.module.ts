import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseAdminController } from './database-admin.controller';
import { DatabaseAdminService } from './database-admin.service';
import { DatabaseAdminGuard } from './guards/database-admin.guard';
import { DatabaseLogService } from './services/database-log.service';
import { LogRotationService } from './services/log-rotation.service';
import { DatabaseAdminCorsMiddleware } from './middleware/database-admin-cors.middleware';
import { PrismaModule } from '../../prisma/prisma.module';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        SystemLogModule,
    ],
    controllers: [DatabaseAdminController],
    providers: [
        DatabaseAdminService,
        DatabaseAdminGuard,
        DatabaseLogService,
        LogRotationService,
    ],
    exports: [DatabaseLogService, LogRotationService],
})
export class DatabaseAdminModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(DatabaseAdminCorsMiddleware)
            .forRoutes('api/admin');
    }
}
