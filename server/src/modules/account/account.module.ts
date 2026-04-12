import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountRepository } from './account.repository';

/**
 * Account Module
 * Quản lý thông tin tài khoản, mật khẩu và liên kết nền tảng
 *
 * Providers:
 * - AccountService: Business logic cho account operations
 * - AccountRepository: Data access layer với optimized queries
 */
@Module({
  imports: [UserModule, NotificationModule, AuthModule],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository],
  exports: [AccountService],
})
export class AccountModule {}
