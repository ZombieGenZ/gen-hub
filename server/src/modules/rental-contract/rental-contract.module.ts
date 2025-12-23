import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { OrganizationModule } from '../organization/organization.module';
import { WarehouseTemplateModule } from '../warehouse-template/warehouse-template.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { UserNotificationModule } from '../user-notification/user-notification.module';

import { RentalContractController } from './rental-contract.controller';
import { OrgRentalContractController } from './org-rental-contract.controller';
import { RentalContractService } from './rental-contract.service';
import { RentalContractRepository } from './rental-contract.repository';
import { RentalContractProcessor } from './rental-contract.processor';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        SystemLogModule,
        OrganizationModule,
        NotificationModule,
        UserNotificationModule, // Added to resolve dependency
        forwardRef(() => PaymentModule),
        forwardRef(() => WarehouseTemplateModule),
        BullModule.registerQueue({
            name: 'rental-contract',
        }),
    ],
    controllers: [RentalContractController, OrgRentalContractController],
    providers: [RentalContractService, RentalContractRepository, RentalContractProcessor],
    exports: [RentalContractService, RentalContractRepository],
})
export class RentalContractModule { }
