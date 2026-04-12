import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateOrganizationUpdateRequestDto {
  @ApiPropertyOptional({ description: 'Mã số thuế', example: '0123456789' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  tax_code?: string;

  @ApiPropertyOptional({
    description: 'Tên người đại diện',
    example: 'Nguyen Van A',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  representative_name?: string;

  @ApiPropertyOptional({
    description: 'Chức vụ người đại diện',
    example: 'Director',
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  representative_title?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại người đại diện',
    example: '0901234567',
  })
  @IsOptional()
  @IsPhoneNumber('VN', {
    message: i18nValidationMessage('validation.IS_PHONE_NUMBER'),
  })
  representative_phone?: string;

  @ApiPropertyOptional({
    description: 'Email người đại diện',
    example: 'representative@company.com',
  })
  @IsOptional()
  @IsEmail({}, { message: i18nValidationMessage('validation.IS_EMAIL') })
  representative_email?: string;
}
