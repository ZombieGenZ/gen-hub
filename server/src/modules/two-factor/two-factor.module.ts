import { Module } from '@nestjs/common';

import { UserModule } from '../user/user.module';
import { BackupCodeModule } from '../backup-code/backup-code.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { BruteForceModule } from '../brute-force/brute-force.module';
import { RedisModule } from '../redis/redis.module';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';

/**
 * Two-Factor Module
 * Quản lý xác thực 2 yếu tố (2FA)
 */
@Module({
  imports: [UserModule, BackupCodeModule, AuthModule, NotificationModule, BruteForceModule, RedisModule],
  controllers: [TwoFactorController],
  providers: [TwoFactorService],
  exports: [TwoFactorService],
})
export class TwoFactorModule { }
