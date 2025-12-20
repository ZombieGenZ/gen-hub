import { Module } from '@nestjs/common';
import { RentalDurationTierController } from './rental-duration-tier.controller';
import { RentalDurationTierService } from './rental-duration-tier.service';
import { RentalDurationTierRepository } from './rental-duration-tier.repository';

@Module({
    controllers: [RentalDurationTierController],
    providers: [RentalDurationTierService, RentalDurationTierRepository],
    exports: [RentalDurationTierService],
})
export class RentalDurationTierModule { }
