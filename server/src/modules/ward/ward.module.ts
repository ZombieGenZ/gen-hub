import { Module } from '@nestjs/common';
import { WardController } from './ward.controller';
import { WardService } from './ward.service';
import { WardRepository } from './ward.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [SharedModule, RedisModule],
    controllers: [WardController],
    providers: [WardService, WardRepository],
    exports: [WardService, WardRepository],
})
export class WardModule { }
