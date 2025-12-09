import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho đăng xuất
 */
export class LogoutDto {
  @ApiProperty({
    description: 'Refresh token cần hủy',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('auth.validation.refresh_token_required'),
  })
  @IsString({
    message: i18nValidationMessage('auth.validation.refresh_token_string'),
  })
  refresh_token: string;
}
