import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho xác minh 2FA khi đăng nhập
 */
export class VerifyTwoFactorLoginDto {
  @ApiProperty({
    description: 'Token tạm thời (nhận được khi login yêu cầu 2FA)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.temp_token_required'),
  })
  @IsString({
    message: i18nValidationMessage('auth.validation.temp_token_string'),
  })
  temp_token: string;

  @ApiPropertyOptional({
    description: 'Mã 2FA từ authenticator app (6 chữ số)',
    example: '123456',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('auth.validation.two_factor_code_string'),
  })
  @Matches(/^[0-9]{6}$/, {
    message: i18nValidationMessage('auth.validation.two_factor_code_pattern'),
  })
  two_factor_code?: string;

  @ApiPropertyOptional({
    description: 'Mã backup (dùng thay thế cho 2FA code)',
    example: 'ABCD1234',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('auth.validation.backup_code_string'),
  })
  backup_code?: string;
}
