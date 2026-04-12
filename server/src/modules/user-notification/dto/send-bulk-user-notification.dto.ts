import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsArray,
  ArrayNotEmpty,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { NotificationType } from '@prisma/client';

/**
 * DTO gửi thông báo cho nhiều users
 */
export class SendBulkUserNotificationDto {
  @ApiProperty({ description: 'Danh sách ID người dùng nhận thông báo' })
  @IsArray({
    message: i18nValidationMessage(
      'user-notification.validation.user_ids_array',
    ),
  })
  @ArrayNotEmpty({
    message: i18nValidationMessage(
      'user-notification.validation.user_ids_required',
    ),
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('user-notification.validation.user_id_uuid'),
  })
  user_ids: string[];

  @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo mới' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-notification.validation.title_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage('user-notification.validation.title_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage(
      'user-notification.validation.title_max_length',
    ),
  })
  title: string;

  @ApiProperty({
    description: 'Nội dung thông báo',
    example: 'Nội dung thông báo chi tiết',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'user-notification.validation.content_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage(
      'user-notification.validation.content_string',
    ),
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Loại thông báo',
    enum: NotificationType,
    default: 'INFO',
  })
  @IsOptional()
  @IsEnum(NotificationType, {
    message: i18nValidationMessage('user-notification.validation.type_invalid'),
  })
  type?: NotificationType;
}
