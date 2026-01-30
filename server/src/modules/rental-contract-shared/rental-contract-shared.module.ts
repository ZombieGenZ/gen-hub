import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { PaymentModule } from '../payment/payment.module';
import { WarehouseTemplateModule } from '../warehouse-template/warehouse-template.module';

import { RentalContractRepository } from './rental-contract.repository';
import { SignatureService } from './signature.service';
import { SignatureCleanupScheduler } from './signature-cleanup.scheduler';
import { RentalContractProcessor } from './rental-contract.processor';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        SystemLogModule,
        forwardRef(() => PaymentModule),
        forwardRef(() => WarehouseTemplateModule),
        BullModule.registerQueue({
            name: 'rental-contract',
        }),
        ScheduleModule.forRoot(),
    ],
    providers: [
        RentalContractRepository,
        SignatureService,
        SignatureCleanupScheduler,
        RentalContractProcessor,
    ],
    exports: [
        RentalContractRepository,
        SignatureService,
        RentalContractProcessor,
        BullModule,
    ],
})
export class RentalContractSharedModule { }
