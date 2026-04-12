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
 * DTO tạo mới ShelfTemplate
 */
export class CreateShelfTemplateDto {
  @ApiProperty({ description: 'Tên tầng', example: 'Tầng 1' })
  @IsNotEmpty({
    message: i18nValidationMessage('shelf-template.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('shelf-template.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage('shelf-template.validation.name_max_length'),
  })
  name: string;

  @ApiProperty({ description: 'Mã tầng', example: 'SHELF-1' })
  @IsNotEmpty({
    message: i18nValidationMessage('shelf-template.validation.code_required'),
  })
  @IsString({
    message: i18nValidationMessage('shelf-template.validation.code_string'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('shelf-template.validation.code_max_length'),
  })
  code: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'shelf-template.validation.description_string',
    ),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Chiều cao tầng (cm)' })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage('shelf-template.validation.height_number'),
    },
  )
  @Min(0, {
    message: i18nValidationMessage('shelf-template.validation.height_min'),
  })
  @Type(() => Number)
  height?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'shelf-template.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;
}
