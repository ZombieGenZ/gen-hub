import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { EmailInboundProvider } from './email-inbound.provider';

/**
 * Email Inbound Module
 * IMAP worker để lắng nghe email unlock từ người dùng
 */
@Module({
    imports: [RedisModule, PrismaModule, NotificationModule],
    providers: [EmailInboundProvider],
    exports: [EmailInboundProvider],
})
export class EmailInboundModule { }
