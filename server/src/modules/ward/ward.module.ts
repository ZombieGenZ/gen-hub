import { Module } from '@nestjs/common';
import { WardController } from './ward.controller';
import { WardService } from './ward.service';
import { WardRepository } from './ward.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WardCacheKeysHelper } from './constants/ward-cache-keys.helper';

@Module({
  imports: [SharedModule, RedisModule],
  controllers: [WardController],
  providers: [WardService, WardRepository, WardCacheKeysHelper],
  exports: [WardService, WardRepository, WardCacheKeysHelper],
})
export class WardModule {}
