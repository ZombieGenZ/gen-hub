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

import { RentalContractController } from './rental-contract.controller';
import { RentalContractService } from './rental-contract.service';

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
    forwardRef(() => PaymentModule),
    forwardRef(() => WarehouseTemplateModule),
  ],
  controllers: [RentalContractController],
  providers: [RentalContractService],
  exports: [RentalContractService],
})
export class RentalContractModule {}
