import { Module } from '@nestjs/common';
import { OrgRefundRequestController } from './org-refund-request.controller';
import { RefundRequestModule } from '../refund-request/refund-request.module';

@Module({
    imports: [RefundRequestModule],
    controllers: [OrgRefundRequestController],
})
export class OrgRefundRequestModule { }
