import { Module } from '@nestjs/common';
import { CouponController } from './coupon.controller';
import { PublicCouponController } from './public-coupon.controller';
import { CouponService } from './coupon.service';
import { CouponRepository } from './coupon.repository';

@Module({
    controllers: [CouponController, PublicCouponController],
    providers: [CouponService, CouponRepository],
    exports: [CouponService, CouponRepository],
})
export class CouponModule { }
