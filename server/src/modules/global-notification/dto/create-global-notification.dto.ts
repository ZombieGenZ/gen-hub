import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsDateString,
    MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { NotificationType } from '@prisma/client';

/**
 * DTO tạo mới GlobalNotification
 */
export class CreateGlobalNotificationDto {
    @ApiProperty({ description: 'Tiêu đề thông báo', example: 'Thông báo bảo trì' })
    @IsNotEmpty({
        message: i18nValidationMessage('global-notification.validation.title_required'),
    })
    @IsString({
        message: i18nValidationMessage('global-notification.validation.title_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('global-notification.validation.title_max_length'),
    })
    title: string;

    @ApiProperty({ description: 'Nội dung thông báo', example: 'Hệ thống sẽ bảo trì vào 2:00 AM' })
    @IsNotEmpty({
        message: i18nValidationMessage('global-notification.validation.content_required'),
    })
    @IsString({
        message: i18nValidationMessage('global-notification.validation.content_string'),
    })
    content: string;

    @ApiPropertyOptional({
        description: 'Loại thông báo',
        enum: NotificationType,
        default: 'INFO'
    })
    @IsOptional()
    @IsEnum(NotificationType, {
        message: i18nValidationMessage('global-notification.validation.type_invalid'),
    })
    type?: NotificationType;

    @ApiPropertyOptional({ description: 'Thời gian bắt đầu hiển thị' })
    @IsOptional()
    @IsDateString({}, {
        message: i18nValidationMessage('global-notification.validation.starts_at_date'),
    })
    starts_at?: string;

    @ApiPropertyOptional({ description: 'Thời gian kết thúc hiển thị' })
    @IsOptional()
    @IsDateString({}, {
        message: i18nValidationMessage('global-notification.validation.ends_at_date'),
    })
    ends_at?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('global-notification.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
