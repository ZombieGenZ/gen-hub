import { Module } from '@nestjs/common';
import { AddonTypeController } from './addon-type.controller';
import { AddonTypeService } from './addon-type.service';
import { AddonTypeRepository } from './addon-type.repository';
import { AddonTypeCacheKeysHelper } from './constants';

@Module({
  controllers: [AddonTypeController],
  providers: [AddonTypeService, AddonTypeRepository, AddonTypeCacheKeysHelper],
  exports: [AddonTypeService, AddonTypeRepository],
})
export class AddonTypeModule {}
