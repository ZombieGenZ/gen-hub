import { Module } from '@nestjs/common';
import { PublicCouponController } from './public-coupon.controller';
import { PublicCouponService } from './public-coupon.service';
import { PublicCouponRepository } from './public-coupon.repository';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule, RedisModule],
    controllers: [PublicCouponController],
    providers: [PublicCouponService, PublicCouponRepository],
    exports: [PublicCouponService, PublicCouponRepository],
})
export class PublicCouponModule { }
