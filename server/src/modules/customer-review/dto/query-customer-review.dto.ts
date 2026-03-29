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
    @ApiPropertyOptional({
        description: 'Số lượng bản ghi tối đa trả về trong một lần truy vấn.',
        default: 10,
        example: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('customer-review.validation.limit_positive') })
    @Min(1, { message: i18nValidationMessage('customer-review.validation.limit_positive') })
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Vị trí bắt đầu để phân trang, tính từ 0.',
        default: 0,
        example: 0,
        minimum: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: i18nValidationMessage('customer-review.validation.offset_min') })
    @Min(0, { message: i18nValidationMessage('customer-review.validation.offset_min') })
    offset?: number = 0;

    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm theo tên khách hàng, email, công ty, tiêu đề hoặc nội dung đánh giá.',
        example: 'Logistics',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái duyệt đánh giá.',
        enum: ReviewStatus,
        example: ReviewStatus.APPROVED,
    })
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

    @ApiPropertyOptional({
        description: 'Lọc các đánh giá được đánh dấu nổi bật.',
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_featured_boolean') })
    is_featured?: boolean;

    @ApiPropertyOptional({
        description: 'Lọc theo trạng thái hoạt động của đánh giá.',
        example: true,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_active_boolean') })
    is_active?: boolean;
}
