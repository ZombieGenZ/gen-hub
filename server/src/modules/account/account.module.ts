import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { NotificationModule } from '../notification/notification.module';
import { AuthModule } from '../auth/auth.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

/**
 * Account Module
 * Quản lý thông tin tài khoản, mật khẩu và liên kết nền tảng
 */
@Module({
  imports: [UserModule, NotificationModule, AuthModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
