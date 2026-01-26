import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO query danh sách Public Coupon
 */
export class QueryPublicCouponDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi mỗi trang', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: i18nValidationMessage('coupon.validation.limit_positive'),
    })
    @Min(1, {
        message: i18nValidationMessage('coupon.validation.limit_positive'),
    })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({
        message: i18nValidationMessage('coupon.validation.offset_min'),
    })
    @Min(0, {
        message: i18nValidationMessage('coupon.validation.offset_min'),
    })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('coupon.validation.keywords_string'),
    })
    keywords?: string;
}
