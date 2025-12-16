import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { I18nModule } from 'nestjs-i18n';
import * as path from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SharedModule } from './common/shared.module';
import { CustomLanguageResolver } from './common/resolvers';
import { AuthModule } from './modules/auth/auth.module';
import { TwoFactorModule } from './modules/two-factor/two-factor.module';
import { AccountModule } from './modules/account/account.module';
import { RedisModule } from './modules/redis/redis.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { BanSchedulerModule } from './modules/ban-scheduler/ban-scheduler.module';
import { ApiKeySchedulerModule } from './modules/apikey-scheduler/apikey-scheduler.module';
import { WarehouseTemplateModule } from './modules/warehouse-template/warehouse-template.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { GlobalNotificationModule } from './modules/global-notification/global-notification.module';
import { UserNotificationModule } from './modules/user-notification/user-notification.module';
import { OrgNotificationModule } from './modules/org-notification/org-notification.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { RentalContractModule } from './modules/rental-contract/rental-contract.module';
import { RentalSchedulerModule } from './modules/rental-scheduler/rental-scheduler.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AmenityModule } from './modules/amenity/amenity.module';
import { JwtAuthGuard, CustomThrottlerGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ScheduleModule.forRoot(),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        url: configService.get('REDIS_URL') || 'redis://localhost:6379/0',
      }),
      inject: [ConfigService],
    }),

    SharedModule,

    RedisModule,

    WebsocketModule,

    I18nModule.forRoot({
      fallbackLanguage: 'vi',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [CustomLanguageResolver],
    }),

    AuthModule,

    TwoFactorModule,

    AccountModule,

    BanSchedulerModule,

    ApiKeySchedulerModule,

    WarehouseTemplateModule,

    OrganizationModule,

    GlobalNotificationModule,

    UserNotificationModule,

    OrgNotificationModule,

    WarehouseModule,

    RentalContractModule,

    RentalSchedulerModule,

    PaymentModule,

    AmenityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule { }

