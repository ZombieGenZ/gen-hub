import { Module, forwardRef } from '@nestjs/common';
import { OrganizationUpdateRequestService } from './organization-update-request.service';
import { OrganizationUpdateRequestController } from './organization-update-request.controller';
import { OrganizationUpdateRequestRepository } from './organization-update-request.repository';
import { OrganizationUpdateRequestCacheKeys } from './constants/cache-keys.helper';

import { OrganizationModule } from '../organization/organization.module';
import { UserNotificationModule } from '../user-notification/user-notification.module';

@Module({
  imports: [forwardRef(() => OrganizationModule), UserNotificationModule],
  controllers: [OrganizationUpdateRequestController],
  providers: [
    OrganizationUpdateRequestService,
    OrganizationUpdateRequestRepository,
    OrganizationUpdateRequestCacheKeys,
  ],
  exports: [
    OrganizationUpdateRequestService,
    OrganizationUpdateRequestCacheKeys,
  ],
})
export class OrganizationUpdateRequestModule {}
