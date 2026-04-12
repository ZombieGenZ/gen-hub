import { Module } from '@nestjs/common';
import { OrganizationBalanceModule } from '../organization-balance/organization-balance.module';
import { RefundRequestController } from './refund-request.controller';
import { RefundRequestService } from './refund-request.service';
import { RefundRequestRepository } from './refund-request.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    WebsocketModule,
    SystemLogModule,
    OrganizationModule,
    ApiKeyVerificationModule,
    OrganizationBalanceModule,
  ],
  controllers: [RefundRequestController],
  providers: [RefundRequestService, RefundRequestRepository],
  exports: [RefundRequestService],
})
export class RefundRequestModule {}
