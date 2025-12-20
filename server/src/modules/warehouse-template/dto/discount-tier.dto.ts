import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * Đơn vị thời gian cho discount tier
 */
export enum DurationUnit {
  MONTH = 'MONTH',
  YEAR = 'YEAR',
}

/**
 * DTO để tạo discount tier mới trong WarehouseTemplate (không có id)
 */
export class CreateDiscountTierDto {
  @ApiProperty({
    description: 'Tên tier',
    example: '1 tháng',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('warehouse-discount-tier.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('warehouse-discount-tier.validation.name_string'),
  })
  name: string;

  @ApiProperty({
    description: 'Giá trị thời gian (ví dụ: 1, 3, 6, 12)',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('warehouse-discount-tier.validation.duration_value_required'),
  })
  @IsInt({
    message: i18nValidationMessage('warehouse-discount-tier.validation.duration_value_int'),
  })
  @Min(1, {
    message: i18nValidationMessage('warehouse-discount-tier.validation.duration_value_min'),
  })
  @Type(() => Number)
  duration_value: number;

  @ApiProperty({
    description: 'Đơn vị thời gian (MONTH hoặc YEAR)',
    enum: DurationUnit,
    example: DurationUnit.MONTH,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('warehouse-discount-tier.validation.duration_unit_required'),
  })
  @IsEnum(DurationUnit, {
    message: i18nValidationMessage('warehouse-discount-tier.validation.duration_unit_invalid'),
  })
  duration_unit: DurationUnit;

  @ApiProperty({
    description: 'Phần trăm giảm giá (0-100)',
    example: 5,
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('warehouse-discount-tier.validation.discount_percent_required'),
  })
  @IsNumber({}, {
    message: i18nValidationMessage('warehouse-discount-tier.validation.discount_percent_number'),
  })
  @Min(0, {
    message: i18nValidationMessage('warehouse-discount-tier.validation.discount_range'),
  })
  @Max(100, {
    message: i18nValidationMessage('warehouse-discount-tier.validation.discount_range'),
  })
  @Type(() => Number)
  discount_percent: number;

  @ApiPropertyOptional({
    description: 'Mô tả tier',
    example: 'Không giảm giá cho thuê ngắn hạn',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('warehouse-discount-tier.validation.description_string'),
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động (ẩn/hiện lựa chọn tier)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('warehouse-discount-tier.validation.is_active_boolean'),
  })
  is_active?: boolean;
}

/**
 * DTO để cập nhật discount tier trong WarehouseTemplate
 * - Nếu có id: update tier hiện có
 * - Nếu không có id: tạo tier mới
 * - Tier hiện có nhưng không trong danh sách sẽ bị xóa
 */
export class UpdateDiscountTierDto extends CreateDiscountTierDto {
  @ApiPropertyOptional({
    description: 'ID của tier (nếu có = update, không có = create)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('warehouse-discount-tier.validation.id_uuid'),
  })
  id?: string;
}

/**
 * @deprecated Use CreateDiscountTierDto or UpdateDiscountTierDto instead
 */
export const DiscountTierDto = UpdateDiscountTierDto;

