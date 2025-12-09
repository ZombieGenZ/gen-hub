import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho xác thực quyền truy cập trước khi thực hiện các thao tác nhạy cảm
 */
export class VerifyAccessDto {
  @ApiPropertyOptional({
    description: 'Mật khẩu - dùng khi chưa bật 2FA',
    example: 'Password@123',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('auth.validation.password_string'),
  })
  password?: string;

  @ApiPropertyOptional({
    description: 'Mã 2FA - dùng khi đã bật 2FA (6 chữ số)',
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
    description: 'Mã backup - dùng thay thế cho 2FA code',
    example: 'ABCD1234',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('auth.validation.backup_code_string'),
  })
  backup_code?: string;
}
