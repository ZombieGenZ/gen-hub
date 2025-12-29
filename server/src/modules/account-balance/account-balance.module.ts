import { Module, forwardRef } from '@nestjs/common';
import { AccountBalanceController } from './account-balance.controller';
import { AccountBalanceAdminController } from './account-balance-admin.controller';
import { AccountBalanceService } from './account-balance.service';
import { AccountBalanceRepository } from './account-balance.repository';
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
    controllers: [AccountBalanceController, AccountBalanceAdminController],
    providers: [AccountBalanceService, AccountBalanceRepository],
    exports: [AccountBalanceService, AccountBalanceRepository],
})
export class AccountBalanceModule { }
