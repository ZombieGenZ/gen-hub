import { Module } from '@nestjs/common';
import { AddonController } from './addon.controller';
import { AddonService } from './addon.service';
import { AddonRepository } from './addon.repository';

@Module({
  controllers: [AddonController],
  providers: [AddonService, AddonRepository],
  exports: [AddonService, AddonRepository],
})
export class AddonModule {}
