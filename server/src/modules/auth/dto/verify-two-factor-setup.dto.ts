import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho xác minh thiết lập 2FA
 */
export class VerifyTwoFactorSetupDto {
  @ApiProperty({
    description: 'Mã 2FA từ authenticator app (6 chữ số)',
    example: '123456',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.two_factor_code_required'),
  })
  @IsString({
    message: i18nValidationMessage('auth.validation.two_factor_code_string'),
  })
  @Matches(/^[0-9]{6}$/, {
    message: i18nValidationMessage('auth.validation.two_factor_code_pattern'),
  })
  two_factor_code: string;
}
