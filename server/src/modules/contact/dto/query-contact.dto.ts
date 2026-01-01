import {
    IsOptional,
    IsInt,
    Min,
    Max,
    IsString,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContactStatus, ContactPriority } from '@prisma/client';

/**
 * DTO query danh sách conversations
 */
export class QueryContactDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;

    @IsOptional()
    @IsString()
    keywords?: string;

    @IsOptional()
    @IsEnum(ContactStatus)
    status?: ContactStatus;

    @IsOptional()
    @IsEnum(ContactPriority)
    priority?: ContactPriority;

    @IsOptional()
    @IsString()
    assigned_staff_id?: string;
}
