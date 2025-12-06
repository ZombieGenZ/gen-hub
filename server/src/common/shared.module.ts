import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from '../prisma/prisma.module';
import { SystemLogModule } from '../modules/system-log/system-log.module';
import { AppConfigModule } from './config/app-config.module';

// Guards
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AccessVerificationGuard } from './guards/access-verification.guard';
import { CustomThrottlerGuard } from './guards/throttler.guard';

/**
 * Shared Module
 * Chứa các module, providers và exports thường được sử dụng chung
 * Đánh dấu @Global() để không cần import lại ở mỗi module
 */
@Global()
@Module({
    imports: [
        // Config Module
        ConfigModule,

        // App Config Module - Dynamic config với JSON file
        AppConfigModule,

        // Prisma Module
        PrismaModule,

        // System Log Module
        SystemLogModule,

        // Passport Module với JWT là strategy mặc định
        PassportModule.register({ defaultStrategy: 'jwt' }),

        // JWT Module với cấu hình async từ ConfigService
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
                signOptions: {
                    expiresIn: '15m',
                },
            }),
        }),

        // Throttler Module cho rate limiting
        ThrottlerModule.forRoot([
            {
                name: 'default',
                ttl: 60000, // 1 phút
                limit: 100, // 100 requests/phút
            },
        ]),
    ],
    providers: [
        JwtAuthGuard,
        AccessVerificationGuard,
        CustomThrottlerGuard,
    ],
    exports: [
        // Re-export các module để các module khác có thể sử dụng
        ConfigModule,
        AppConfigModule,
        PrismaModule,
        PassportModule,
        JwtModule,
        ThrottlerModule,
        SystemLogModule,

        // Export Guards
        JwtAuthGuard,
        AccessVerificationGuard,
        CustomThrottlerGuard,
    ],
})
export class SharedModule { }
