import { Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { PartnerRepository } from './partner.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
  imports: [
    SharedModule,
    RedisModule,
    WebsocketModule,
    OrganizationModule,
    ApiKeyVerificationModule,
  ],
  controllers: [PartnerController],
  providers: [PartnerService, PartnerRepository],
  exports: [PartnerService, PartnerRepository],
})
export class PartnerModule {}
