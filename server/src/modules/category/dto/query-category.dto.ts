import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CategoryStatus } from '@prisma/client';

/**
 * DTO query danh sách Category
 */
export class QueryCategoryDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi', default: 10 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt({
        message: i18nValidationMessage('category.validation.limit_integer'),
    })
    @Min(1, {
        message: i18nValidationMessage('category.validation.limit_min'),
    })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt({
        message: i18nValidationMessage('category.validation.offset_integer'),
    })
    @Min(0, {
        message: i18nValidationMessage('category.validation.offset_min'),
    })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('category.validation.keywords_string'),
    })
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái',
        enum: CategoryStatus,
    })
    @IsOptional()
    @IsEnum(CategoryStatus, {
        message: i18nValidationMessage('category.validation.status_enum'),
    })
    status?: CategoryStatus;

    @ApiPropertyOptional({ description: 'Lọc theo is_active' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean({
        message: i18nValidationMessage('category.validation.is_active_boolean'),
    })
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Lọc theo is_featured' })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean({
        message: i18nValidationMessage('category.validation.is_featured_boolean'),
    })
    is_featured?: boolean;
}
