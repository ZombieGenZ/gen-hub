import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DurationUnit } from '@prisma/client';

/**
 * DTO để tạo/cập nhật TierAddonGift khi create/update RentalDurationTier
 */
export class TierAddonGiftDto {
  @ApiPropertyOptional({
    description: 'ID của TierAddonGift (khi update)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'rental-duration-tier.validation.tier_gift_id_uuid',
    ),
  })
  id?: string;

  @ApiProperty({ description: 'ID của Addon', example: 'addon-uuid' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'rental-duration-tier.validation.addon_id_required',
    ),
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'rental-duration-tier.validation.addon_id_uuid',
    ),
  })
  addon_id: string;

  // Điều kiện: Đơn hàng tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu đơn hàng tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_order_amount?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu',
    example: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_amount?: number;

  // Điều kiện: Số kho tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu số kho tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_warehouses?: boolean;

  @ApiPropertyOptional({ description: 'Số kho tối thiểu', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  min_warehouses?: number;

  // Điều kiện: Số row tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu số row tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_rows?: boolean;

  @ApiPropertyOptional({ description: 'Số row tối thiểu', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  min_rows?: number;

  // Thời hạn addon
  @ApiPropertyOptional({
    description: 'Addon có hiệu lực đến khi hết dịch vụ',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_until_service_end?: boolean;

  @ApiPropertyOptional({
    description: 'Thời gian tặng kèm (nếu không phải until_service_end)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  gift_duration_value?: number;

  @ApiPropertyOptional({
    description: 'Đơn vị thời gian tặng kèm',
    enum: DurationUnit,
  })
  @IsOptional()
  @IsEnum(DurationUnit)
  gift_duration_unit?: DurationUnit;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
