import { Module } from '@nestjs/common';
import { CouponScheduleController } from './coupon-schedule.controller';
import { CouponScheduleService } from './coupon-schedule.service';
import { CouponScheduleRepository } from './coupon-schedule.repository';
import { CouponScheduleRunnerService } from './coupon-schedule-runner.service';

@Module({
    controllers: [CouponScheduleController],
    providers: [CouponScheduleService, CouponScheduleRepository, CouponScheduleRunnerService],
    exports: [CouponScheduleService, CouponScheduleRepository],
})
export class CouponScheduleModule { }
