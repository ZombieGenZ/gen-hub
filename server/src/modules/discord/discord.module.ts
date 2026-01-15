import { Module, Global, forwardRef } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { CozeModule } from '../coze/coze.module';
import { DatabaseBackupModule } from '../database-backup/database-backup.module';
import { BackblazeB2Module } from '../backblaze-b2/backblaze-b2.module';

/**
 * Discord Module
 * Module để tích hợp Discord cho support tickets
 * Tính năng có thể bật/tắt qua DISCORD_ENABLED trong .env
 */
@Global()
@Module({
    imports: [
        CozeModule,
        forwardRef(() => DatabaseBackupModule),
        BackblazeB2Module,
    ],
    providers: [DiscordService],
    exports: [DiscordService],
})
export class DiscordModule { }
