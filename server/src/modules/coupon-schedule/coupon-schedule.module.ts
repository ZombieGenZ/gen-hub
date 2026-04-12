import { Module, forwardRef } from '@nestjs/common';
import { CouponScheduleController } from './coupon-schedule.controller';
import { CouponScheduleService } from './coupon-schedule.service';
import { CouponScheduleRepository } from './repositories/coupon-schedule.repository';
import { CouponScheduleCacheKeys } from './constants/coupon-schedule-cache-keys.helper';
import { CouponScheduleRunnerService } from './coupon-schedule-runner.service';
import { CouponModule } from '../coupon/coupon.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [forwardRef(() => CouponModule), ConfigModule],
  controllers: [CouponScheduleController],
  providers: [
    CouponScheduleService,
    CouponScheduleRepository,
    CouponScheduleCacheKeys,
    CouponScheduleRunnerService,
  ],
  exports: [CouponScheduleService, CouponScheduleRepository],
})
export class CouponScheduleModule {}
