import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type, Transform } from 'class-transformer';
import { NotificationType } from '@prisma/client';

/**
 * DTO query danh sách GlobalNotification với phân trang và lọc
 */
export class QueryGlobalNotificationDto {
  @ApiPropertyOptional({ description: 'Số lượng record', example: 10 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'global-notification.validation.limit_positive',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'global-notification.validation.limit_positive',
    ),
  })
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'global-notification.validation.offset_min',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage('global-notification.validation.offset_min'),
  })
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm', example: 'bảo trì' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'global-notification.validation.keywords_string',
    ),
  })
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái hoạt động',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({
    message: i18nValidationMessage(
      'global-notification.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Lọc theo loại thông báo',
    enum: NotificationType,
  })
  @IsOptional()
  @IsEnum(NotificationType, {
    message: i18nValidationMessage(
      'global-notification.validation.type_invalid',
    ),
  })
  type?: NotificationType;
}
