import {
    IsOptional,
    IsInt,
    Min,
    Max,
    IsString,
    IsEnum,
    IsBoolean,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    is_priority_customer?: boolean;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    is_skipped?: boolean;
}
