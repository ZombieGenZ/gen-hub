import { Module } from '@nestjs/common';
import { ProvinceController } from './province.controller';
import { ProvinceService } from './province.service';
import { ProvinceRepository } from './province.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [SharedModule, RedisModule],
    controllers: [ProvinceController],
    providers: [ProvinceService, ProvinceRepository],
    exports: [ProvinceService, ProvinceRepository],
})
export class ProvinceModule { }
