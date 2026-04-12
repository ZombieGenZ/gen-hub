import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { NotificationModule } from '../notification/notification.module';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { OrganizationAuditLogService } from './organization-audit-log.service';
import { OrganizationEmailValidatorService } from './organization-email-validator.service';
import { OrganizationUpdateRequestModule } from '../organization-update-request/organization-update-request.module';

@Module({
  imports: [
    SharedModule,
    RedisModule,
    WebsocketModule,
    SystemLogModule,
    NotificationModule,
    forwardRef(() => OrganizationUpdateRequestModule),
  ],
  controllers: [OrganizationController],

  providers: [
    OrganizationService,
    OrganizationRepository,
    OrganizationAuditLogService,
    OrganizationEmailValidatorService,
  ],
  exports: [
    OrganizationService,
    OrganizationRepository,
    OrganizationAuditLogService,
  ],
})
export class OrganizationModule {}
