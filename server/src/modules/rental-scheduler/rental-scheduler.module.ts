import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { RentalContractModule } from '../rental-contract/rental-contract.module';
import { OrgNotificationModule } from '../org-notification/org-notification.module';

import { RentalSchedulerService } from './rental-scheduler.service';

@Module({
    imports: [
        SharedModule,
        SystemLogModule,
        RentalContractModule,
        OrgNotificationModule,
    ],
    providers: [RentalSchedulerService],
    exports: [RentalSchedulerService],
})
export class RentalSchedulerModule { }

