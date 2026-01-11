import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseBackupService } from './database-backup.service';
import { DatabaseBackupController } from './database-backup.controller';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [
        ConfigModule,
        ScheduleModule.forRoot(),
        GoogleDriveModule,
        RedisModule,
        WebsocketModule,
        PrismaModule,
    ],
    controllers: [DatabaseBackupController],
    providers: [DatabaseBackupService],
    exports: [DatabaseBackupService],
})
export class DatabaseBackupModule { }
