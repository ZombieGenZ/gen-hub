import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SharedModule } from '../../common/shared.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { WebsocketModule } from '../websocket/websocket.module';

import { SepayService } from './sepay.service';
import { PaymentSchedulerService } from './payment-scheduler.service';
import { PaymentController } from './payment.controller';

@Module({
    imports: [
        SharedModule,
        SystemLogModule,
        WebsocketModule,
        BullModule.registerQueue({
            name: 'rental-contract',
        }),
    ],
    controllers: [PaymentController],
    providers: [SepayService, PaymentSchedulerService],
    exports: [SepayService, PaymentSchedulerService],
})
export class PaymentModule { }
