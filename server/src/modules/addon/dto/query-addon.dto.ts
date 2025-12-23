import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO query danh sách Addon
 */
export class QueryAddonDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi mỗi trang', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: i18nValidationMessage('addon.validation.limit_positive'),
    })
    @Min(1, {
        message: i18nValidationMessage('addon.validation.limit_positive'),
    })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: i18nValidationMessage('addon.validation.offset_min'),
    })
    @Min(0, {
        message: i18nValidationMessage('addon.validation.offset_min'),
    })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('addon.validation.keywords_string'),
    })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({
        message: i18nValidationMessage('addon.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
