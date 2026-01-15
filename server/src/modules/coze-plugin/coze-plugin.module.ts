import { Module } from '@nestjs/common';
import { CozePluginController } from './coze-plugin.controller';
import { CozePluginService } from './coze-plugin.service';
import { CozePluginRepository } from './coze-plugin.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [PrismaModule, RedisModule],
    controllers: [CozePluginController],
    providers: [CozePluginService, CozePluginRepository],
    exports: [CozePluginService],
})
export class CozePluginModule { }
