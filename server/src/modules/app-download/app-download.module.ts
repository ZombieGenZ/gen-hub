import { Module } from '@nestjs/common';
import { AppDownloadController } from './app-download.controller';
import { AppDownloadService } from './app-download.service';
import { AppDownloadRepository } from './app-download.repository';
import { NotificationModule } from '../notification/notification.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
        NotificationModule, // Ensure NotificationModule exports EmailService
    ],
    controllers: [AppDownloadController],
    providers: [AppDownloadService, AppDownloadRepository],
    exports: [AppDownloadService],
})
export class AppDownloadModule { }
