import { Module } from '@nestjs/common';
import { AppDownloadController } from './app-download.controller';
import { AppDownloadService } from './app-download.service';
import { AppDownloadRepository } from './app-download.repository';
import { NotificationModule } from '../notification/notification.module';
import { ConfigModule } from '@nestjs/config';
import { PermissionModule } from '../permission/permission.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';
import { RedisModule } from '../redis/redis.module';
import { AppDownloadCacheKeys } from './constants/app-download-cache.helper';
import { InviteSchedulerService } from './invite-scheduler.service';

@Module({
    imports: [
        NotificationModule,
        ConfigModule,
        PermissionModule,
        ApiKeyVerificationModule,
        RedisModule,
    ],
    controllers: [AppDownloadController],
    providers: [
        AppDownloadService,
        AppDownloadRepository,
        AppDownloadCacheKeys,
        InviteSchedulerService,
    ],
    exports: [AppDownloadService, AppDownloadRepository],
})
export class AppDownloadModule { }
