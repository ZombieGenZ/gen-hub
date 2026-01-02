import { Module, Global } from '@nestjs/common';
import { DiscordService } from './discord.service';

/**
 * Discord Module
 * Module để tích hợp Discord cho support tickets
 * Tính năng có thể bật/tắt qua DISCORD_ENABLED trong .env
 */
@Global()
@Module({
    providers: [DiscordService],
    exports: [DiscordService],
})
export class DiscordModule { }
