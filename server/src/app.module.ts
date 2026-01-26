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
import { InsuranceModule } from './modules/insurance/insurance.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { PublicCouponModule } from './modules/public-coupon/public-coupon.module';
import { CouponScheduleModule } from './modules/coupon-schedule/coupon-schedule.module';
import { DatabaseAdminModule } from './modules/database-admin/database-admin.module';
import { FeatureFlagModule } from './modules/feature-flag/feature-flag.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BruteForceModule } from './modules/brute-force/brute-force.module';
import { EmailInboundModule } from './modules/email-inbound/email-inbound.module';
import { AccountBalanceModule } from './modules/account-balance/account-balance.module';
import { OrganizationUpdateRequestModule } from './modules/organization-update-request/organization-update-request.module';
import { DatabaseLogModule } from './modules/database-log/database-log.module';
import { AddonTypeModule } from './modules/addon-type/addon-type.module';
import { FaqModule } from './modules/faq/faq.module';
import { ContactModule } from './modules/contact/contact.module';
import { ContactTagModule } from './modules/contact-tag/contact-tag.module';
import { ContactListModule } from './modules/contact-list/contact-list.module';
import { QCManagementModule } from './modules/qc-management/qc-management.module';
import { RefundRequestModule } from './modules/refund-request/refund-request.module';
import { CategoryModule } from './modules/category/category.module';
import { ArticleModule } from './modules/article/article.module';
import { JwtAuthGuard, CustomThrottlerGuard } from './common/guards';
import { CozeModule } from './modules/coze/coze.module';
import { CozePluginModule } from './modules/coze-plugin/coze-plugin.module';
import { OrgChatModule } from './modules/org-chat/org-chat.module';
import { BackblazeB2Module } from './modules/backblaze-b2/backblaze-b2.module';
import { DatabaseBackupModule } from './modules/database-backup/database-backup.module';
import { WarningCategoryModule } from './modules/warning-category/warning-category.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { WarnPenaltyModule } from './modules/warn-penalty/warn-penalty.module';
import { WarnSchedulerModule } from './modules/warn-scheduler/warn-scheduler.module';
import { PermissionModule } from './modules/permission/permission.module';
import { RoleModule } from './modules/role/role.module';


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

    // Addon Types
    AddonTypeModule,

    // Addons
    AddonModule,

    // Insurances
    InsuranceModule,

    // Coupons
    CouponModule,

    // Public Coupons
    PublicCouponModule,

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

    // QC Management Module
    QCManagementModule,

    // Organizations
    OrganizationModule,

    // Organization Chat with Agora
    OrgChatModule,

    // Organization-level modules
    PartnerModule,
    ProductModule,
    BatchModule,

    // Organization Update Request
    OrganizationUpdateRequestModule,

    // Rental Contracts
    RentalContractModule,

    // Warehouses
    WarehouseModule,

    // Payment
    PaymentModule,

    // Account Balance
    AccountBalanceModule,

    // Notifications
    UserNotificationModule,
    GlobalNotificationModule,
    OrgNotificationModule,

    // Schedulers
    BanSchedulerModule,
    ApiKeySchedulerModule,
    RentalSchedulerModule,
    WarnSchedulerModule,

    // FAQs
    FaqModule,

    // Refund Request Module
    RefundRequestModule,

    // Contact Tags Module
    ContactTagModule,

    // Contact List (Blacklist/Whitelist)
    ContactListModule,

    // Contact Support Module
    ContactModule,

    // Category Module
    CategoryModule,

    // Article Module
    ArticleModule,

    // Coze AI Module
    CozeModule,

    // Coze AI Plugin APIs (Public)
    CozePluginModule,

    // User Warning & Account Management
    WarningCategoryModule,
    WarnPenaltyModule,
    UserManagementModule,

    // System Permissions & Roles
    PermissionModule,
    RoleModule,

    // Database Panel
    DatabaseAdminModule,

    // Feature Flag Management
    FeatureFlagModule,

    // Resources Management
    ResourcesModule,

    // Analytics
    AnalyticsModule,

    // Security - Brute Force Protection
    BruteForceModule,

    // Email Inbound Worker
    EmailInboundModule,

    // Database Auto-logging
    DatabaseLogModule,

    // Backblaze B2 + Cloudflare CDN Integration
    BackblazeB2Module,

    // Database Backup
    DatabaseBackupModule,
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
