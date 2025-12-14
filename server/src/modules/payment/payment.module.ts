import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { SystemLogModule } from '../system-log/system-log.module';

import { PayosService } from './payos.service';
import { PaymentController } from './payment.controller';

@Module({
    imports: [
        SharedModule,
        SystemLogModule,
    ],
    controllers: [PaymentController],
    providers: [PayosService],
    exports: [PayosService],
})
export class PaymentModule { }
