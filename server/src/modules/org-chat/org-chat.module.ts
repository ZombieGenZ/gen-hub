import { Module } from '@nestjs/common';
import { OrgChatController } from './org-chat.controller';
import { OrgChatService } from './org-chat.service';
import { OrgChatRepository } from './org-chat.repository';
import { AgoraService } from './agora.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RedisModule } from '../redis/redis.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
    imports: [PrismaModule, WebsocketModule, RedisModule, OrganizationModule],
    controllers: [OrgChatController],
    providers: [OrgChatService, OrgChatRepository, AgoraService],
    exports: [OrgChatService, AgoraService],
})
export class OrgChatModule { }
