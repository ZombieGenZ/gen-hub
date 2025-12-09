import { Module } from '@nestjs/common';
import { BackupCodeService, BackupCodeRepository } from './backup-code.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Backup Code Module
 * Quản lý backup codes cho 2FA
 */
@Module({
  imports: [PrismaModule],
  providers: [BackupCodeService, BackupCodeRepository],
  exports: [BackupCodeService],
})
export class BackupCodeModule {}
