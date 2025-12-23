import { PartialType } from '@nestjs/swagger';
import { CreateCouponScheduleDto } from './create-coupon-schedule.dto';

/**
 * DTO cập nhật CouponSchedule
 */
export class UpdateCouponScheduleDto extends PartialType(CreateCouponScheduleDto) { }
