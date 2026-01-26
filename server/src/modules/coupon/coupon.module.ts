import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { CouponRepository } from './repositories/coupon.repository';
import { CouponCacheKeys } from './constants/coupon-cache-keys.helper';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [PrismaModule, RedisModule, WebsocketModule, SystemLogModule, ConfigModule],
    controllers: [CouponController],
    providers: [CouponService, CouponRepository, CouponCacheKeys],
    exports: [CouponService, CouponRepository],
})
export class CouponModule { }
