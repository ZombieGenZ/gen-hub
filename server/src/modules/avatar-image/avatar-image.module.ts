import { Module } from '@nestjs/common';
import { AvatarImageCacheKeysHelper } from './constants';
import { AvatarImageController } from './avatar-image.controller';
import { AvatarImageRepository } from './avatar-image.repository';
import { AvatarImageService } from './avatar-image.service';

@Module({
  controllers: [AvatarImageController],
  providers: [AvatarImageService, AvatarImageRepository, AvatarImageCacheKeysHelper],
  exports: [AvatarImageService],
})
export class AvatarImageModule {}
