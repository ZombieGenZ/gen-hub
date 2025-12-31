import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { NotificationModule } from '../notification/notification.module';
import { OrganizationController } from './organization.controller';
import { OrganizationRoleController } from './organization-role.controller';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyVerifyController } from './api-key-verify.controller';
import { ApiKeyAdminController } from './api-key-admin.controller';
import { OrganizationService } from './organization.service';
import { OrganizationRepository } from './organization.repository';
import { OrganizationAuditLogService } from './organization-audit-log.service';
import { ApiKeyLogService } from './api-key-log.service';
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
    controllers: [
        OrganizationController,
        OrganizationRoleController,
        ApiKeyController,
        ApiKeyVerifyController,
        ApiKeyAdminController,
    ],

    providers: [
        OrganizationService,
        OrganizationRepository,
        OrganizationAuditLogService,
        ApiKeyLogService,
        OrganizationEmailValidatorService,
    ],
    exports: [
        OrganizationService,
        OrganizationRepository,
        OrganizationAuditLogService,
        ApiKeyLogService,
    ],
})
export class OrganizationModule { }

