import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { NotificationType } from '@prisma/client';

/**
 * DTO tạo mới OrganizationNotification
 */
export class CreateOrgNotificationDto {
  @ApiProperty({
    description: 'Tiêu đề thông báo',
    example: 'Thông báo nội bộ',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'org-notification.validation.title_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage('org-notification.validation.title_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage(
      'org-notification.validation.title_max_length',
    ),
  })
  title: string;

  @ApiProperty({
    description: 'Nội dung thông báo',
    example: 'Nội dung thông báo cho tổ chức',
  })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'org-notification.validation.content_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage(
      'org-notification.validation.content_string',
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
    message: i18nValidationMessage('org-notification.validation.type_invalid'),
  })
  type?: NotificationType;

  @ApiPropertyOptional({
    description: 'ID kho hàng (nếu thông báo cho kho cụ thể)',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'org-notification.validation.warehouse_id_uuid',
    ),
  })
  warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'org-notification.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;
}
