import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * User Module
 * Quản lý users và user repository
 */
@Module({
  imports: [PrismaModule],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
