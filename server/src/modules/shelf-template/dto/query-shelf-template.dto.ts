import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO query danh sách ShelfTemplate với phân trang và filter
 */
export class QueryShelfTemplateDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi tối đa', default: 10 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('shelf-template.validation.limit_number'),
    })
    @Min(1, {
        message: i18nValidationMessage('shelf-template.validation.limit_min'),
    })
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({ description: 'Số bản ghi bỏ qua', default: 0 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('shelf-template.validation.offset_number'),
    })
    @Min(0, {
        message: i18nValidationMessage('shelf-template.validation.offset_min'),
    })
    @Type(() => Number)
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (theo tên, mã, mô tả)' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('shelf-template.validation.keywords_string'),
    })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái active' })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('shelf-template.validation.is_active_boolean'),
    })
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    is_active?: boolean;
}
