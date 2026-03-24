import { ReviewStatus } from '@prisma/client';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class QueryCustomerReviewDto {
    @ApiPropertyOptional({ description: 'Số lượng bản ghi', default: 10 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('customer-review.validation.limit_positive') })
    @Min(1, { message: i18nValidationMessage('customer-review.validation.limit_positive') })
    limit?: number = 10;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', default: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('customer-review.validation.offset_min') })
    @Min(0, { message: i18nValidationMessage('customer-review.validation.offset_min') })
    offset?: number = 0;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên, email, công ty, tiêu đề hoặc nội dung' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: ReviewStatus })
    @IsOptional()
    @IsEnum(ReviewStatus, { message: i18nValidationMessage('customer-review.validation.status_invalid') })
    status?: ReviewStatus;

    @ApiPropertyOptional({ description: 'Lọc theo số sao', minimum: 1, maximum: 5, example: 5 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('customer-review.validation.rating_integer') })
    @Min(1, { message: i18nValidationMessage('customer-review.validation.rating_min') })
    @Max(5, { message: i18nValidationMessage('customer-review.validation.rating_max') })
    rating?: number;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái nổi bật' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_featured_boolean') })
    is_featured?: boolean;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_active_boolean') })
    is_active?: boolean;
}
