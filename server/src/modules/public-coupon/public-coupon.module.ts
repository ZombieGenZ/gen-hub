import { Module } from '@nestjs/common';
import { PublicCouponController } from './public-coupon.controller';
import { PublicCouponService } from './public-coupon.service';
import { PublicCouponRepository } from './repositories/public-coupon.repository';
import { PublicCouponCacheKeys } from './constants/public-coupon-cache-keys.helper';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  controllers: [PublicCouponController],
  providers: [
    PublicCouponService,
    PublicCouponRepository,
    PublicCouponCacheKeys,
  ],
  exports: [PublicCouponService, PublicCouponRepository],
})
export class PublicCouponModule {}
