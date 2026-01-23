import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { BackupCodeModule } from '../backup-code/backup-code.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { BruteForceModule } from '../brute-force/brute-force.module';
import { RedisModule } from '../redis/redis.module';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorRepository } from './repositories/two-factor.repository';

/**
 * Two-Factor Module
 * Quản lý xác thực 2 yếu tố (2FA)
 */
@Module({
  imports: [
    PrismaModule,
    BackupCodeModule,
    AuthModule,
    NotificationModule,
    BruteForceModule,
    RedisModule,
  ],
  controllers: [TwoFactorController],
  providers: [TwoFactorService, TwoFactorRepository],
  exports: [TwoFactorService, TwoFactorRepository],
})
export class TwoFactorModule { }
