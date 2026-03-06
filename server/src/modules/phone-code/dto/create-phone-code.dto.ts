import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, IsUrl } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreatePhoneCodeDto {
  @ApiProperty({ description: 'Tên quốc gia', example: 'Việt Nam' })
  @IsNotEmpty({ message: i18nValidationMessage('phone-code.validation.name_required') })
  @IsString({ message: i18nValidationMessage('phone-code.validation.name_string') })
  @MaxLength(255, { message: i18nValidationMessage('phone-code.validation.name_max_length') })
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('phone-code.validation.description_string') })
  description?: string;

  @ApiProperty({ description: 'Đầu số điện thoại', example: '+84' })
  @IsNotEmpty({ message: i18nValidationMessage('phone-code.validation.code_required') })
  @IsString({ message: i18nValidationMessage('phone-code.validation.code_string') })
  @Matches(/^\+\d{1,5}$/, { message: i18nValidationMessage('phone-code.validation.code_format') })
  code: string;

  @ApiPropertyOptional({ description: 'URL cờ quốc gia' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('phone-code.validation.flag_url_string') })
  @IsUrl({}, { message: i18nValidationMessage('phone-code.validation.flag_url_url') })
  flag_url?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('phone-code.validation.is_active_boolean') })
  is_active?: boolean;
}
