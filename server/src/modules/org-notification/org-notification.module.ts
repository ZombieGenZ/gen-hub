import { Module } from '@nestjs/common';
import { OrgNotificationController } from './org-notification.controller';
import { OrgNotificationService } from './org-notification.service';
import { OrgNotificationRepository } from './org-notification.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
    imports: [SharedModule, RedisModule, WebsocketModule, OrganizationModule],
    controllers: [OrgNotificationController],
    providers: [OrgNotificationService, OrgNotificationRepository],
    exports: [OrgNotificationService],
})
export class OrgNotificationModule { }
