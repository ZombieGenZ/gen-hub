import { Module } from '@nestjs/common';
import { PublicCatalogController } from './public-catalog.controller';
import { AddonModule } from '../addon/addon.module';
import { InsuranceModule } from '../insurance/insurance.module';
import { RentalDurationTierModule } from '../rental-duration-tier/rental-duration-tier.module';

@Module({
  imports: [AddonModule, InsuranceModule, RentalDurationTierModule],
  controllers: [PublicCatalogController],
})
export class PublicCatalogModule {}
