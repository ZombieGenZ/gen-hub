import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/payment.module';
import { PaymentAdminController } from './payment-admin.controller';

@Module({
    imports: [PaymentModule],
    controllers: [PaymentAdminController],
})
export class PaymentAdminModule { }
