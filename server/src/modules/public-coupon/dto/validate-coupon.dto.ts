import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CheckApplicableCouponDto } from './check-applicable-coupon.dto';

/**
 * DTO validate coupon code có thể áp dụng cho đơn hàng
 */
export class ValidateCouponDto extends CheckApplicableCouponDto {
  @ApiProperty({
    description: 'Mã coupon cần kiểm tra',
    example: 'SUMMER2024',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('coupon.validation.code_required'),
  })
  @IsString({
    message: i18nValidationMessage('coupon.validation.code_string'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('coupon.validation.code_max_length'),
  })
  code: string;
}
