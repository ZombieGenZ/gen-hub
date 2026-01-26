import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';
import { CouponRepository } from './coupon.repository';
import { RedisModule } from '../redis/redis.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule, RedisModule, WebsocketModule, SystemLogModule],
    controllers: [CouponController],
    providers: [CouponService, CouponRepository],
    exports: [CouponService, CouponRepository],
})
export class CouponModule { }
