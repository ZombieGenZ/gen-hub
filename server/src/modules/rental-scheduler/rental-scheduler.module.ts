import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from '../../common/shared.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { RentalContractSharedModule } from '../rental-contract-shared/rental-contract-shared.module';
import { OrgNotificationModule } from '../org-notification/org-notification.module';

import { RentalSchedulerService } from './rental-scheduler.service';

@Module({
    imports: [
        SharedModule,
        SystemLogModule,
        RentalContractSharedModule,
        OrgNotificationModule,
        ScheduleModule.forRoot(),
    ],
    providers: [RentalSchedulerService],
    exports: [RentalSchedulerService],
})
export class RentalSchedulerModule { }

