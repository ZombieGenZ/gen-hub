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
 * DTO config addon gifts for WarehouseTemplate
 */
export class WarehouseAddonGiftDto {
  @ApiPropertyOptional({
    description: 'ID of WarehouseAddonGift (when update)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.gift_id_uuid',
    ),
  })
  id?: string;

  @ApiProperty({ description: 'ID of Addon', example: 'addon-uuid' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.addon_id_required',
    ),
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.addon_id_uuid',
    ),
  })
  addon_id: string;

  // Removed min order amount, min warehouses, min rows conditions as per requirement

  // Duration of gift
  @ApiPropertyOptional({
    description: 'Gift is valid until service end',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_until_service_end?: boolean;

  @ApiPropertyOptional({
    description: 'Gift duration value (if not until_service_end)',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  gift_duration_value?: number;

  @ApiPropertyOptional({
    description: 'Gift duration unit',
    enum: DurationUnit,
  })
  @IsOptional()
  @IsEnum(DurationUnit)
  gift_duration_unit?: DurationUnit;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
