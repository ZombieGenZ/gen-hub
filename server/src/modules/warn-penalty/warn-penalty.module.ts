import { Module } from '@nestjs/common';
import { WarnPenaltyController } from './warn-penalty.controller';
import { WarnPenaltyService } from './warn-penalty.service';
import { WarnPenaltyRepository } from './warn-penalty.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        SystemLogModule,
        WebsocketModule,
    ],
    controllers: [WarnPenaltyController],
    providers: [WarnPenaltyService, WarnPenaltyRepository],
    exports: [WarnPenaltyService, WarnPenaltyRepository],
})
export class WarnPenaltyModule { }
