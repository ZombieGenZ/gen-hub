import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';

/**
 * Notification Module
 * Quản lý dịch vụ gửi email
 * (SMS đã được loại bỏ)
 */
@Module({
    imports: [ConfigModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class NotificationModule { }
