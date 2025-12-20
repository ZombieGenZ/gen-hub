import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Transform, Type } from 'class-transformer';

/**
 * DTO query cho danh sách mốc thời gian thuê
 */
export class QueryRentalDurationTierDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi', default: 10 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('rental-duration-tier.validation.limit_positive') })
    @Min(1, { message: i18nValidationMessage('rental-duration-tier.validation.limit_positive') })
    @Type(() => Number)
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('rental-duration-tier.validation.offset_min') })
    @Min(0, { message: i18nValidationMessage('rental-duration-tier.validation.offset_min') })
    @Type(() => Number)
    offset?: number = 0;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('rental-duration-tier.validation.keywords_string'),
    })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({
        message: i18nValidationMessage('rental-duration-tier.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
