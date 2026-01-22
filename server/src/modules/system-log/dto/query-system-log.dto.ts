import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LogLevel } from '@prisma/client';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho query system logs với validation
 * Sử dụng i18n cho tất cả validation messages
 */
export class QuerySystemLogDto {
    @ApiPropertyOptional({
        description: 'Page number (1-based)',
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('system-log.validation.page_positive') })
    @Min(1, { message: i18nValidationMessage('system-log.validation.page_positive') })
    page?: number;

    @ApiPropertyOptional({
        description: 'Items per page',
        default: 50,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('system-log.validation.limit_positive') })
    @Min(1, { message: i18nValidationMessage('system-log.validation.limit_positive') })
    @Max(100, { message: i18nValidationMessage('system-log.validation.limit_max') })
    limit?: number;

    @ApiPropertyOptional({
        description: 'Filter by log level',
        enum: LogLevel,
    })
    @IsOptional()
    @IsEnum(LogLevel, { message: i18nValidationMessage('system-log.validation.level_invalid') })
    level?: LogLevel;

    @ApiPropertyOptional({
        description: 'Filter by module name (case-insensitive)',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('system-log.validation.module_string') })
    module?: string;

    @ApiPropertyOptional({
        description: 'Search in message and action (case-insensitive)',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('system-log.validation.search_string') })
    search?: string;

    @ApiPropertyOptional({
        description: 'Start date filter (ISO 8601 format)',
    })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined))
    startDate?: Date;

    @ApiPropertyOptional({
        description: 'End date filter (ISO 8601 format)',
    })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined))
    endDate?: Date;
}
