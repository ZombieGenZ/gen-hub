import { Module } from '@nestjs/common';
import { OrgRefundRequestController } from './org-refund-request.controller';
import { RefundRequestModule } from '../refund-request/refund-request.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
    imports: [
        RefundRequestModule,
        ApiKeyVerificationModule,
    ],
    controllers: [OrgRefundRequestController],
})
export class OrgRefundRequestModule { }
