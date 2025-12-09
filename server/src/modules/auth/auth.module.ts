import { Module } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserModule } from '../user/user.module';
import { BackupCodeModule } from '../backup-code/backup-code.module';
import { NotificationModule } from '../notification/notification.module';

/**
 * Auth Module
 * Quản lý authentication và authorization
 */
@Module({
  imports: [UserModule, BackupCodeModule, NotificationModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshTokenRepository],
  exports: [AuthService, JwtStrategy, RefreshTokenRepository],
})
export class AuthModule {}
