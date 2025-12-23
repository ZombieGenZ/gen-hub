import { PartialType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';

/**
 * DTO cập nhật Coupon
 */
export class UpdateCouponDto extends PartialType(CreateCouponDto) { }
