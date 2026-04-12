import { Module } from '@nestjs/common';
import { AmenityController } from './amenity.controller';
import { AmenityService } from './amenity.service';
import { AmenityRepository } from './amenity.repository';
import { AmenityCacheKeysHelper } from './constants';

@Module({
  controllers: [AmenityController],
  providers: [AmenityService, AmenityRepository, AmenityCacheKeysHelper],
  exports: [AmenityService],
})
export class AmenityModule {}
