import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { DurationUnit } from '@prisma/client';

/**
 * DTO config insurance gifts for WarehouseTemplate
 */
export class WarehouseInsuranceGiftDto {
  @ApiPropertyOptional({
    description: 'ID of WarehouseInsuranceGift (when update)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.gift_id_uuid',
    ),
  })
  id?: string;

  @ApiProperty({ description: 'ID of Insurance', example: 'insurance-uuid' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.insurance_id_required',
    ),
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.insurance_id_uuid',
    ),
  })
  insurance_id: string;

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
