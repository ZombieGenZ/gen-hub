import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho yêu cầu xóa tài khoản
 */
export class DeleteAccountDto {
  @ApiPropertyOptional({
    description: 'Lý do xóa tài khoản (tùy chọn)',
    example: 'Không còn sử dụng dịch vụ',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('account.validation.reason_string'),
  })
  @MaxLength(500, {
    message: i18nValidationMessage('account.validation.reason_max_length'),
  })
  reason?: string;

  @ApiProperty({
    description: 'Xác nhận xóa - phải gõ "XÓA TÀI KHOẢN" hoặc "DELETE ACCOUNT"',
    example: 'XÓA TÀI KHOẢN',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('account.validation.confirmation_required'),
  })
  @IsString({
    message: i18nValidationMessage('account.validation.confirmation_string'),
  })
  confirmation: string;
}
