import { Module, forwardRef } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ContactModule } from '../contact/contact.module';
import { EmailInboundProvider } from './email-inbound.provider';

/**
 * Email Inbound Module
 * IMAP worker để lắng nghe email unlock từ người dùng và contact ticket replies
 */
@Module({
    imports: [RedisModule, PrismaModule, NotificationModule, forwardRef(() => ContactModule)],
    providers: [EmailInboundProvider],
    exports: [EmailInboundProvider],
})
export class EmailInboundModule { }

