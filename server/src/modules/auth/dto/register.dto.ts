import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { IsValidLanguage } from '../../../common/validators';

/**
 * DTO cho đăng ký tài khoản mới
 * Chỉ hỗ trợ đăng ký bằng email
 */
export class RegisterDto {
  @ApiProperty({
    description: 'Tên người dùng',
    example: 'Nguyễn Văn A',
    minLength: 2,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.name_required'),
  })
  @IsString({ message: i18nValidationMessage('auth.validation.name_string') })
  @MinLength(2, {
    message: i18nValidationMessage('auth.validation.name_min_length'),
  })
  name: string;

  @ApiProperty({
    description: 'Email',
    example: 'user@example.com',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.email_required'),
  })
  @IsEmail(
    {},
    { message: i18nValidationMessage('auth.validation.email_invalid') },
  )
  email: string;

  @ApiProperty({
    description:
      'Mật khẩu (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)',
    example: 'Password@123',
    minLength: 8,
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.password_required'),
  })
  @IsString({
    message: i18nValidationMessage('auth.validation.password_string'),
  })
  @MinLength(8, {
    message: i18nValidationMessage('auth.validation.password_min_length'),
  })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_])[A-Za-z\d@$!%*?&_]{8,}$/,
    {
      message: i18nValidationMessage('auth.validation.password_pattern'),
    },
  )
  password: string;

  @ApiPropertyOptional({
    description: 'Ngôn ngữ (vi, en)',
    example: 'vi',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('auth.validation.language_string'),
  })
  @IsValidLanguage({
    message: i18nValidationMessage('auth.validation.language_invalid'),
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'Cloudflare Turnstile token',
    example: '0.abc123...',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @ApiPropertyOptional({
    description: 'Mã OTP 6 chữ số gửi về email (dùng khi tạo tài khoản)',
    example: '482910',
  })
  @IsOptional()
  @IsString()
  @Length(6, 6, { message: 'OTP phải là 6 chữ số' })
  otp?: string;
}

