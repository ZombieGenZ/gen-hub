import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO khởi tạo phiên chat live
 * - Có JWT: không bắt buộc truyền session (uid). Hệ thống tạo sessionId và lưu user_id.
 * - Không JWT: bắt buộc truyền session (uid) để định danh guest.
 */
export class StartChatDto {
  @ApiPropertyOptional({
    description:
      'Session ID (uid) để định danh guest. Bắt buộc khi không gửi JWT.',
    example: 'session-abc-123',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.string') })
  @MaxLength(200, {
    message: i18nValidationMessage('common.validation.max_length'),
  })
  session?: string;

  /** @deprecated Dùng session thay thế. Giữ để tương thích. */
  @ApiPropertyOptional({
    description:
      'UID (session ID) - alias của session. Bắt buộc khi không gửi JWT.',
    example: 'session-abc-123',
    maxLength: 200,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.string') })
  @MaxLength(200, {
    message: i18nValidationMessage('common.validation.max_length'),
  })
  uid?: string;

  @ApiPropertyOptional({
    description: 'Tin nhắn đầu tiên',
    example: 'Tôi muốn hỏi về dịch vụ thuê kho',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('common.validation.string') })
  @MaxLength(2000, {
    message: i18nValidationMessage('common.validation.max_length'),
  })
  initialMessage?: string;
}
