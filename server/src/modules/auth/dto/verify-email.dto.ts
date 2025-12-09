import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho xác thực email
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Token xác thực email (nhận từ email)',
    example: 'abc123def456...',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.token_required'),
  })
  @IsString({ message: i18nValidationMessage('auth.validation.token_string') })
  token: string;
}
