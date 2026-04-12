import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo mới ContactTag
 */
export class CreateContactTagDto {
  @ApiProperty({ description: 'Tên tag', example: 'Hỗ trợ kỹ thuật' })
  @IsNotEmpty({
    message: i18nValidationMessage('contact-tag.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('contact-tag.validation.name_string'),
  })
  @MinLength(1, {
    message: i18nValidationMessage('contact-tag.validation.name_min'),
  })
  @MaxLength(50, {
    message: i18nValidationMessage('contact-tag.validation.name_max'),
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả tag',
    example: 'Các vấn đề về kỹ thuật',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('contact-tag.validation.description_string'),
  })
  @MaxLength(200, {
    message: i18nValidationMessage('contact-tag.validation.description_max'),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'Màu sắc (hex)', example: '#3B82F6' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('contact-tag.validation.color_string'),
  })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: i18nValidationMessage('contact-tag.validation.color_hex'),
  })
  color?: string;
}
