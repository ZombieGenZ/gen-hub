import { Module } from '@nestjs/common';
import { RedisAdminService } from './redis-admin.service';
import { RedisAdminController } from './redis-admin.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [RedisAdminController],
  providers: [RedisAdminService],
  exports: [RedisAdminService],
})
export class RedisAdminModule {}
