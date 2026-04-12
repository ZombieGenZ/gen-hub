import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO để tạo discount config cho Warehouse (liên kết với RentalDurationTier)
 */
export class CreateDiscountConfigDto {
  @ApiProperty({
    description: 'ID của mốc thời gian thuê (RentalDurationTier)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.duration_tier_id_required',
    ),
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.duration_tier_id_uuid',
    ),
  })
  duration_tier_id: string;

  @ApiProperty({
    description: 'Phần trăm giảm giá (0-100)',
    example: 5,
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.discount_percent_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.discount_percent_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'warehouse-template.validation.discount_range',
    ),
  })
  @Max(100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.discount_range',
    ),
  })
  @Type(() => Number)
  discount_percent: number;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'warehouse-template.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;
}

/**
 * DTO để cập nhật discount config cho Warehouse
 * - Nếu có id: update config hiện có
 * - Nếu không có id: tạo config mới
 */
export class UpdateDiscountConfigDto extends CreateDiscountConfigDto {
  @ApiPropertyOptional({
    description: 'ID của config (nếu có = update, không có = create)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.config_id_uuid',
    ),
  })
  id?: string;
}
