import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { OrganizationModule } from '../organization/organization.module';
import { WarehouseTemplateModule } from '../warehouse-template/warehouse-template.module';
import { NotificationModule } from '../notification/notification.module';
import { PaymentModule } from '../payment/payment.module';
import { UserNotificationModule } from '../user-notification/user-notification.module';
import { RentalContractSharedModule } from '../rental-contract-shared/rental-contract-shared.module';
import { PublicCouponModule } from '../public-coupon/public-coupon.module';

import { OrgRentalContractController } from './org-rental-contract.controller';
import { OrgRentalContractService } from './org-rental-contract.service';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        SystemLogModule,
        OrganizationModule,
        NotificationModule,
        UserNotificationModule,
        RentalContractSharedModule,
        PublicCouponModule,
        forwardRef(() => PaymentModule),
        forwardRef(() => WarehouseTemplateModule),
    ],
    controllers: [OrgRentalContractController],
    providers: [OrgRentalContractService],
    exports: [OrgRentalContractService],
})
export class OrgRentalContractModule { }
