import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { OrganizationApiKeyModule } from '../organization-api-key/organization-api-key.module';
import { ApiKeyVerifyController } from './api-key-verification.controller';
import { ApiKeyVerificationService } from './api-key-verification.service';

@Module({
  imports: [SharedModule, OrganizationApiKeyModule],
  controllers: [ApiKeyVerifyController],
  providers: [ApiKeyVerificationService],
  exports: [ApiKeyVerificationService],
})
export class ApiKeyVerificationModule {}
