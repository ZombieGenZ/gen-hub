import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { OrganizationApiKeyController } from './organization-api-key.controller';
import { OrganizationApiKeyService } from './organization-api-key.service';
import { OrganizationApiKeyRepository } from './organization-api-key.repository';
import { ApiKeyLogService } from './api-key-log.service';
import { RedisModule } from '../redis/redis.module';
import { OrganizationApiKeyCacheKeys } from './constants/cache-keys.helper';

@Module({
  imports: [SharedModule, WebsocketModule, OrganizationModule, RedisModule],
  controllers: [OrganizationApiKeyController],
  providers: [
    OrganizationApiKeyService,
    OrganizationApiKeyRepository,
    ApiKeyLogService,
    OrganizationApiKeyCacheKeys,
  ],
  exports: [
    OrganizationApiKeyService,
    OrganizationApiKeyRepository,
    ApiKeyLogService,
    OrganizationApiKeyCacheKeys,
  ],
})
export class OrganizationApiKeyModule {}
