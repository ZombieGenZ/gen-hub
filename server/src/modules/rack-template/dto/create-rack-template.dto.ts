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
 * DTO tạo mới RackTemplate
 */
export class CreateRackTemplateDto {
  @ApiProperty({ description: 'Tên kệ', example: 'Kệ 1' })
  @IsNotEmpty({
    message: i18nValidationMessage('rack-template.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('rack-template.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage('rack-template.validation.name_max_length'),
  })
  name: string;

  @ApiProperty({ description: 'Mã kệ', example: 'RACK-1' })
  @IsNotEmpty({
    message: i18nValidationMessage('rack-template.validation.code_required'),
  })
  @IsString({
    message: i18nValidationMessage('rack-template.validation.code_string'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('rack-template.validation.code_max_length'),
  })
  code: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'rack-template.validation.description_string',
    ),
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Khả năng chịu tải mặc định của block (kg)',
  })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'rack-template.validation.default_block_max_weight_capacity_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'rack-template.validation.default_block_max_weight_capacity_min',
    ),
  })
  @Type(() => Number)
  default_block_max_weight_capacity?: number;

  @ApiPropertyOptional({ description: 'Ngưỡng quá tải (%)' })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'rack-template.validation.overload_threshold_percent_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'rack-template.validation.overload_threshold_percent_min',
    ),
  })
  @Type(() => Number)
  overload_threshold_percent?: number;

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

  @ApiPropertyOptional({ description: 'Góc xoay' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  position_rotation?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng (mét)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dimensions_width?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (mét)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dimensions_height?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'rack-template.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;
}
