import { Module } from '@nestjs/common';
import { InventoryRequestController } from './inventory-request.controller';
import { InventoryRequestService } from './inventory-request.service';
import { InventoryRequestRepository } from './inventory-request.repository';
import { SmartSlottingService } from './smart-slotting.service';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';
import { InventoryRequestCacheKeys } from './constants/inventory-request-cache.helper';

@Module({
    imports: [
        SharedModule,
        RedisModule,
        WebsocketModule,
        OrganizationModule,
        ApiKeyVerificationModule,
    ],
    controllers: [InventoryRequestController],
    providers: [InventoryRequestService, InventoryRequestRepository, InventoryRequestCacheKeys, SmartSlottingService],
    exports: [InventoryRequestService, InventoryRequestRepository, InventoryRequestCacheKeys, SmartSlottingService],
})
export class InventoryRequestModule { }
