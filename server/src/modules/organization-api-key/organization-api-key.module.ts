import { Module } from '@nestjs/common';
import { SharedModule } from '../../common/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { OrganizationApiKeyController } from './organization-api-key.controller';
import { OrganizationApiKeyService } from './organization-api-key.service';
import { OrganizationApiKeyRepository } from './organization-api-key.repository';
import { ApiKeyLogService } from './api-key-log.service';

@Module({
    imports: [
        SharedModule,
        WebsocketModule,
        OrganizationModule,
    ],
    controllers: [OrganizationApiKeyController],
    providers: [
        OrganizationApiKeyService,
        OrganizationApiKeyRepository,
        ApiKeyLogService,
    ],
    exports: [
        OrganizationApiKeyService,
        OrganizationApiKeyRepository,
        ApiKeyLogService,
    ],
})
export class OrganizationApiKeyModule { }
