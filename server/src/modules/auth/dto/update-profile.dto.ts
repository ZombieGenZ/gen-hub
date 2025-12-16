import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsValidLanguage } from '../../../common/validators';

/**
 * DTO cho cập nhật thông tin tài khoản
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'Tên mới',
    example: 'Nguyễn Văn B',
    minLength: 2,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('auth.validation.name_string') })
  @MinLength(2, {
    message: i18nValidationMessage('auth.validation.name_min_length'),
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Ngôn ngữ (vi, en)',
    example: 'en',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('auth.validation.language_string'),
  })
  @IsValidLanguage({
    message: i18nValidationMessage('auth.validation.language_invalid'),
  })
  language?: string;
}

