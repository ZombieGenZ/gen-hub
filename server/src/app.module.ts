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
import { ProvinceModule } from './modules/province/province.module';
import { WardModule } from './modules/ward/ward.module';
import { PartnerModule } from './modules/partner/partner.module';
import { ProductModule } from './modules/product/product.module';
import { BatchModule } from './modules/batch/batch.module';
import { RentalDurationTierModule } from './modules/rental-duration-tier/rental-duration-tier.module';
import { RowTemplateModule } from './modules/row-template/row-template.module';
import { RackTemplateModule } from './modules/rack-template/rack-template.module';
import { ShelfTemplateModule } from './modules/shelf-template/shelf-template.module';
import { BlockTemplateModule } from './modules/block-template/block-template.module';
import { AddonModule } from './modules/addon/addon.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { CouponScheduleModule } from './modules/coupon-schedule/coupon-schedule.module';
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

    // Core Infrastructure
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

    // Auth & Account
    AuthModule,
    AccountModule,
    TwoFactorModule,

    // Public APIs
    ProvinceModule,
    WardModule,

    // Amenities
    AmenityModule,

    // Addons
    AddonModule,

    // Coupons
    CouponModule,

    // Coupon Schedules
    CouponScheduleModule,

    // Rental Duration Tiers
    RentalDurationTierModule,

    // Layout Template Modules
    WarehouseTemplateModule,
    RowTemplateModule,
    RackTemplateModule,
    ShelfTemplateModule,
    BlockTemplateModule,

    // Organizations
    OrganizationModule,

    // Rental Contracts
    RentalContractModule,

    // Warehouses
    WarehouseModule,

    // Payment
    PaymentModule,

    // Notifications
    GlobalNotificationModule,
    UserNotificationModule,
    OrgNotificationModule,

    // Schedulers
    BanSchedulerModule,
    ApiKeySchedulerModule,
    RentalSchedulerModule,

    // Organization-level modules
    PartnerModule,
    ProductModule,
    BatchModule,
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
