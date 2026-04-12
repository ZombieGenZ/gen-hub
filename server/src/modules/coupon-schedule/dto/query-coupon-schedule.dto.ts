import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO query danh sách CouponSchedule
 */
export class QueryCouponScheduleDto {
  @ApiPropertyOptional({ description: 'Số lượng bản ghi', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({
    message: i18nValidationMessage('coupon-schedule.validation.limit_positive'),
  })
  @Min(1, {
    message: i18nValidationMessage('coupon-schedule.validation.limit_positive'),
  })
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, {
    message: i18nValidationMessage('coupon-schedule.validation.offset_min'),
  })
  offset?: number;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'coupon-schedule.validation.keywords_string',
    ),
  })
  keywords?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;
}
