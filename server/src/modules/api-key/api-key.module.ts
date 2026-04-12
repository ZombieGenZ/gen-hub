import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { OrganizationModule } from '../organization/organization.module';
import { OrganizationApiKeyModule } from '../organization-api-key/organization-api-key.module';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { RedisModule } from '../redis/redis.module';
import { AdminApiKeyCacheKeys } from './constants/cache-keys.helper';

@Module({
  imports: [
    SharedModule,
    OrganizationModule,
    OrganizationApiKeyModule,
    RedisModule,
  ],

  controllers: [ApiKeyController],
  providers: [ApiKeyService, AdminApiKeyCacheKeys],
  exports: [ApiKeyService, AdminApiKeyCacheKeys],
})
export class ApiKeyModule {}
