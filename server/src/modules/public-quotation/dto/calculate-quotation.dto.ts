import {
  IsNotEmpty,
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO for calculating rental quotation
 */
export class CalculateQuotationDto {
  @ApiProperty({
    description: 'ID of the warehouse template',
    example: 'uuid-here',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'quotation.validation.warehouse_template_id_required',
    ),
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'quotation.validation.warehouse_template_id_uuid',
    ),
  })
  warehouse_template_id: string;

  @ApiProperty({
    description: 'Rental type: whole or row',
    example: 'whole',
  })
  @IsNotEmpty()
  @IsString()
  rental_type: 'whole' | 'row';

  @ApiPropertyOptional({
    description: 'IDs of row templates (for row rental)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  row_template_ids?: string[];

  @ApiProperty({
    description: 'ID of the rental duration tier',
    example: 'uuid-here',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'quotation.validation.duration_tier_id_required',
    ),
  })
  @IsUUID('4', {
    message: i18nValidationMessage(
      'quotation.validation.duration_tier_id_uuid',
    ),
  })
  duration_tier_id: string;

  @ApiPropertyOptional({
    description: 'IDs of selected addons',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  addon_ids?: string[];

  @ApiPropertyOptional({
    description: 'ID of selected insurance',
  })
  @IsOptional()
  @IsUUID('4')
  insurance_id?: string;

  @ApiPropertyOptional({
    description: 'Coupon code to apply',
  })
  @IsOptional()
  @IsString()
  coupon_code?: string;

  @ApiPropertyOptional({
    description: 'Start date of rental',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;
}
