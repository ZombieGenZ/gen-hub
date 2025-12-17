import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from '../prisma/prisma.module';
import { SystemLogModule } from '../modules/system-log/system-log.module';
import { AppConfigModule } from './config/app-config.module';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessVerificationGuard } from './guards/access-verification.guard';
import { CustomThrottlerGuard } from './guards/throttler.guard';

import { ImageUploadService } from './services/image-upload.service';
import { CipherService } from './services/cipher.service';

/**
 * Shared Module
 * Chứa các module, providers và exports thường được sử dụng chung
 * Đánh dấu @Global() để không cần import lại ở mỗi module
 */
@Global()
@Module({
  imports: [
    ConfigModule,

    AppConfigModule,

    PrismaModule,

    SystemLogModule,

    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),

    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  providers: [
    JwtAuthGuard,
    AccessVerificationGuard,
    CustomThrottlerGuard,
    ImageUploadService,
    CipherService,
  ],
  exports: [
    ConfigModule,
    AppConfigModule,
    PrismaModule,
    PassportModule,
    JwtModule,
    ThrottlerModule,
    SystemLogModule,

    JwtAuthGuard,
    AccessVerificationGuard,
    CustomThrottlerGuard,
    ImageUploadService,
    CipherService,
  ],
})
export class SharedModule { }

