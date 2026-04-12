import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO gửi tin nhắn trong live chat
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn',
    example: 'Tôi muốn thuê kho 100m2 ở Quận 7',
    minLength: 1,
    maxLength: 5000,
  })
  @IsString({ message: i18nValidationMessage('common.validation.string') })
  @MinLength(1, {
    message: i18nValidationMessage('common.validation.min_length'),
  })
  @MaxLength(5000, {
    message: i18nValidationMessage('common.validation.max_length'),
  })
  content: string;
}
