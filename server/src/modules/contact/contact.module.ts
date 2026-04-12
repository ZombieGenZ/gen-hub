import { Module, forwardRef } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactRepository } from './contact.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { NotificationModule } from '../notification/notification.module';
import { UserModule } from '../user/user.module';
import { SharedModule } from '../../common/shared.module';
import { AiHubModule } from '../ai-hub';
import { ContactListModule } from '../contact-list/contact-list.module';
import { ContactCacheKeysHelper } from './helpers/contact-cache-keys.helper';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    forwardRef(() => WebsocketModule),
    SystemLogModule,
    NotificationModule,
    UserModule,
    SharedModule,
    AiHubModule,
    ContactListModule,
  ],
  controllers: [ContactController],
  providers: [ContactService, ContactRepository, ContactCacheKeysHelper],
  exports: [ContactService, ContactRepository, ContactCacheKeysHelper],
})
export class ContactModule {}
