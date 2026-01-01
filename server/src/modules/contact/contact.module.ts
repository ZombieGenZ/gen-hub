import { Module, forwardRef } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { ContactRepository } from './contact.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        forwardRef(() => WebsocketModule),
        SystemLogModule,
        NotificationModule,
    ],
    controllers: [ContactController],
    providers: [ContactService, ContactRepository],
    exports: [ContactService, ContactRepository],
})
export class ContactModule { }
