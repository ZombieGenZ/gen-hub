import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo yêu cầu liên hệ từ form website (public)
 */
export class CreateContactDto {
  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên khách hàng' })
  @IsString({
    message: i18nValidationMessage('contact.validation.name_required'),
  })
  @MinLength(2, {
    message: i18nValidationMessage('contact.validation.name_min'),
  })
  @MaxLength(100, {
    message: i18nValidationMessage('contact.validation.name_max'),
  })
  name: string;

  @ApiProperty({
    example: 'nguyen.van.a@example.com',
    description: 'Email khách hàng',
  })
  @IsEmail(
    {},
    { message: i18nValidationMessage('contact.validation.email_invalid') },
  )
  email: string;

  @ApiProperty({
    example: '0912345678',
    description: 'Số điện thoại',
    required: false,
  })
  @IsOptional()
  @Matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/, {
    message: i18nValidationMessage('contact.validation.phone_invalid'),
  })
  phone?: string;

  @ApiProperty({
    example: 'Công ty ABC',
    description: 'Tên công ty',
    required: false,
  })
  @IsOptional()
  @MaxLength(200)
  company?: string;

  @ApiProperty({
    example: 'Hỗ trợ kỹ thuật',
    description: 'Chủ đề',
    required: false,
  })
  @IsOptional()
  @MaxLength(200, {
    message: i18nValidationMessage('contact.validation.subject_max'),
  })
  subject?: string;

  @ApiProperty({
    example: 'Tôi cần hỗ trợ về...',
    description: 'Nội dung tin nhắn',
  })
  @IsString({
    message: i18nValidationMessage('contact.validation.message_required'),
  })
  @MinLength(10, {
    message: i18nValidationMessage('contact.validation.message_min'),
  })
  @MaxLength(5000, {
    message: i18nValidationMessage('contact.validation.message_max'),
  })
  message: string;
}
