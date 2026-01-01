import {
    IsOptional,
    IsEnum,
    IsString,
    IsUUID,
    IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactStatus, ContactPriority } from '@prisma/client';

/**
 * DTO cập nhật conversation (status, priority, assign, tags)
 */
export class UpdateContactDto {
    @ApiPropertyOptional({ enum: ContactStatus, description: 'Trạng thái ticket' })
    @IsOptional()
    @IsEnum(ContactStatus)
    status?: ContactStatus;

    @ApiPropertyOptional({ enum: ContactPriority, description: 'Mức độ ưu tiên' })
    @IsOptional()
    @IsEnum(ContactPriority)
    priority?: ContactPriority;

    @ApiPropertyOptional({ description: 'ID nhân viên được gán' })
    @IsOptional()
    @IsUUID()
    assigned_staff_id?: string;

    @ApiPropertyOptional({ description: 'Danh sách tags phân loại' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}
