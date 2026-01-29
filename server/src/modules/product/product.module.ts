import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './product.repository';
import { SharedModule } from '../../common/shared.module';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { OrganizationModule } from '../organization/organization.module';
import { ApiKeyVerificationModule } from '../api-key-verification/api-key-verification.module';

@Module({
    imports: [SharedModule, RedisModule, WebsocketModule, OrganizationModule, ApiKeyVerificationModule],
    controllers: [ProductController],
    providers: [ProductService, ProductRepository],
    exports: [ProductService, ProductRepository],
})
export class ProductModule { }
