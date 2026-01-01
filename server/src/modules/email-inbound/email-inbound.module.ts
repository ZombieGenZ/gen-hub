import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { ContactModule } from '../contact/contact.module';
import { EmailInboundProvider } from './email-inbound.provider';
import { GmailApiService } from './gmail-api.service';
import { GmailWebhookController } from './gmail-webhook.controller';

/**
 * Email Inbound Module
 * Sử dụng Gmail API để lắng nghe email unlock và contact ticket replies
 * Hỗ trợ Push (Pub/Sub) và Polling mode
 */
@Module({
    imports: [
        ScheduleModule.forRoot(),
        RedisModule,
        PrismaModule,
        NotificationModule,
        forwardRef(() => ContactModule),
    ],
    controllers: [GmailWebhookController],
    providers: [GmailApiService, EmailInboundProvider],
    exports: [GmailApiService, EmailInboundProvider],
})
export class EmailInboundModule { }
