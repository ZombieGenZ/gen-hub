import { Module } from '@nestjs/common';
import { CoverImageCacheKeysHelper } from './constants';
import { CoverImageController } from './cover-image.controller';
import { CoverImageRepository } from './cover-image.repository';
import { CoverImageService } from './cover-image.service';

@Module({
  controllers: [CoverImageController],
  providers: [
    CoverImageService,
    CoverImageRepository,
    CoverImageCacheKeysHelper,
  ],
  exports: [CoverImageService],
})
export class CoverImageModule {}
