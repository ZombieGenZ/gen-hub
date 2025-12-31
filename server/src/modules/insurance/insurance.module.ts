import { Module } from '@nestjs/common';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { InsuranceRepository } from './insurance.repository';

/**
 * Module cho Insurance - Bảo hiểm
 */
@Module({
    controllers: [InsuranceController],
    providers: [InsuranceService, InsuranceRepository],
    exports: [InsuranceService, InsuranceRepository],
})
export class InsuranceModule { }
