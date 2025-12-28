import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho yêu cầu quên mật khẩu
 * Chỉ hỗ trợ qua email
 */
export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email đăng ký tài khoản',
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

  @ApiPropertyOptional({
    description: 'Cloudflare Turnstile token',
    example: '0.abc123...',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
