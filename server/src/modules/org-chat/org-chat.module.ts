import { Module } from '@nestjs/common';
import { OrgChatController } from './org-chat.controller';
import { OrgChatService } from './org-chat.service';
import { OrgChatRepository } from './org-chat.repository';
import { AgoraService } from './agora.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { RedisModule } from '../redis/redis.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';
import { OrgChatCacheKeys } from './constants/cache-keys.helper';


@Module({
    imports: [PrismaModule, WebsocketModule, RedisModule, OrganizationModule, ApiKeyVerificationModule],
    controllers: [OrgChatController],
    providers: [OrgChatService, OrgChatRepository, AgoraService, OrgChatCacheKeys],
    exports: [OrgChatService, AgoraService, OrgChatCacheKeys],

})
export class OrgChatModule { }
