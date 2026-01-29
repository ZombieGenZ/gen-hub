import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { OrganizationModule } from '../organization/organization.module';
import { OrganizationApiKeyModule } from '../organization-api-key/organization-api-key.module';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';

@Module({
    imports: [
        SharedModule,
        OrganizationModule,
        OrganizationApiKeyModule,
    ],
    controllers: [ApiKeyController],
    providers: [
        ApiKeyService,
    ],
    exports: [
        ApiKeyService,
    ],
})
export class ApiKeyModule { }
