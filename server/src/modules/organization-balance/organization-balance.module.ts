import { Module, forwardRef } from '@nestjs/common';
import { OrganizationBalanceController } from './organization-balance.controller';

import { OrganizationBalanceService } from './organization-balance.service';
import { OrganizationBalanceRepository } from './organization-balance.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    SharedModule,
    RedisModule,
    WebsocketModule,
    SystemLogModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [OrganizationBalanceController],
  providers: [OrganizationBalanceService, OrganizationBalanceRepository],
  exports: [OrganizationBalanceService, OrganizationBalanceRepository],
})
export class OrganizationBalanceModule {}
