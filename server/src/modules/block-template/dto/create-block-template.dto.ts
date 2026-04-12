import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';

/**
 * DTO tạo mới BlockTemplate
 */
export class CreateBlockTemplateDto {
  @ApiProperty({ description: 'Tên ô', example: 'Ô 1' })
  @IsNotEmpty({
    message: i18nValidationMessage('block-template.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('block-template.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage('block-template.validation.name_max_length'),
  })
  name: string;

  @ApiProperty({ description: 'Mã ô', example: 'BLOCK-1' })
  @IsNotEmpty({
    message: i18nValidationMessage('block-template.validation.code_required'),
  })
  @IsString({
    message: i18nValidationMessage('block-template.validation.code_string'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('block-template.validation.code_max_length'),
  })
  code: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'block-template.validation.description_string',
    ),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Khả năng chịu tải tối đa (kg)' })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'block-template.validation.max_weight_capacity_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'block-template.validation.max_weight_capacity_min',
    ),
  })
  @Type(() => Number)
  max_weight_capacity?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)' })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('block-template.validation.height_number'),
    },
  )
  @Min(0, {
    message: i18nValidationMessage('block-template.validation.height_min'),
  })
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ description: 'Vị trí X' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  position_x?: number;

  @ApiPropertyOptional({ description: 'Vị trí Y' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  position_y?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'block-template.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;
}
