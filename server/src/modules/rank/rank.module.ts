import { Module } from '@nestjs/common';
import { RankCacheKeysHelper } from './constants';
import { RankController } from './rank.controller';
import { RankRepository } from './rank.repository';
import { RankService } from './rank.service';

@Module({
  controllers: [RankController],
  providers: [RankService, RankRepository, RankCacheKeysHelper],
  exports: [RankService],
})
export class RankModule {}

