import { Module } from '@nestjs/common';
import { OrgAnalyticsController } from './org-analytics.controller';
import { OrgAnalyticsService } from './services/org-analytics.service';
import { OrgAnalyticsCacheKeys } from './services/cache-keys.helper';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
  imports: [ApiKeyVerificationModule],
  controllers: [OrgAnalyticsController],
  providers: [OrgAnalyticsService, OrgAnalyticsCacheKeys],
  exports: [OrgAnalyticsService],
})
export class OrgAnalyticsModule {}
