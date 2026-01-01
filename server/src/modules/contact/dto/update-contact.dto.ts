import {
    IsOptional,
    IsEnum,
    IsString,
    IsUUID,
    IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactStatus, ContactPriority } from '@prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cập nhật conversation (status, priority, assign, tags)
 */
export class UpdateContactDto {
    @ApiPropertyOptional({ enum: ContactStatus, description: 'Trạng thái ticket' })
    @IsOptional()
    @IsEnum(ContactStatus, { message: i18nValidationMessage('validation.INVALID_ENUM') })
    status?: ContactStatus;

    @ApiPropertyOptional({ enum: ContactPriority, description: 'Mức độ ưu tiên' })
    @IsOptional()
    @IsEnum(ContactPriority, { message: i18nValidationMessage('validation.INVALID_ENUM') })
    priority?: ContactPriority;

    @ApiPropertyOptional({ description: 'Danh sách ID của tags (ContactTag) để gán cho conversation' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true, message: i18nValidationMessage('validation.INVALID_UUID') })
    tags?: string[];

    @ApiPropertyOptional({ description: 'Danh sách ID nhân viên (User) để gán cho conversation (Sync: thêm mới hoặc xóa bỏ dựa trên danh sách này)' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true, message: i18nValidationMessage('validation.INVALID_UUID') })
    staff_ids?: string[];
}
