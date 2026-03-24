import { ReviewStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateCustomerReviewDto {
    @ApiProperty({ description: 'Tên khách hàng', example: 'Nguyễn Văn An' })
    @IsNotEmpty({ message: i18nValidationMessage('customer-review.validation.customer_name_required') })
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_name_string') })
    customer_name: string;

    @ApiPropertyOptional({ description: 'Email khách hàng', example: 'an.nguyen@example.com' })
    @IsOptional()
    @IsEmail({}, { message: i18nValidationMessage('customer-review.validation.customer_email_invalid') })
    customer_email?: string;

    @ApiPropertyOptional({ description: 'Số điện thoại khách hàng', example: '+84901234567' })
    @IsOptional()
    @IsPhoneNumber(undefined, { message: i18nValidationMessage('customer-review.validation.customer_phone_invalid') })
    customer_phone?: string;

    @ApiPropertyOptional({ description: 'Tên công ty', example: 'Công ty TNHH ABC Logistics' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_company_string') })
    customer_company?: string;

    @ApiPropertyOptional({ description: 'Chức vụ', example: 'Trưởng phòng vận hành' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_position_string') })
    customer_position?: string;

    @ApiPropertyOptional({ description: 'URL ảnh đại diện', example: 'https://cdn.example.com/avatar/customer-review-1.jpg' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_avatar_string') })
    customer_avatar?: string;

    @ApiProperty({ description: 'Điểm đánh giá từ 1 đến 5', example: 5, minimum: 1, maximum: 5 })
    @IsInt({ message: i18nValidationMessage('customer-review.validation.rating_integer') })
    @Min(1, { message: i18nValidationMessage('customer-review.validation.rating_min') })
    @Max(5, { message: i18nValidationMessage('customer-review.validation.rating_max') })
    rating: number;

    @ApiPropertyOptional({ description: 'Tiêu đề đánh giá', example: 'Dịch vụ rất chuyên nghiệp' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.title_string') })
    title?: string;

    @ApiProperty({
        description: 'Nội dung đánh giá',
        example: 'GEN-HUB hỗ trợ rất nhanh và quy trình thuê kho rõ ràng, minh bạch.',
    })
    @IsNotEmpty({ message: i18nValidationMessage('customer-review.validation.content_required') })
    @IsString({ message: i18nValidationMessage('customer-review.validation.content_string') })
    content: string;

    @ApiPropertyOptional({
        description: 'Phản hồi từ hệ thống hoặc nhân viên',
        example: 'Cảm ơn anh đã tin tưởng và sử dụng dịch vụ của GEN-HUB.',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.reply_string') })
    reply?: string;

    @ApiPropertyOptional({ description: 'Trạng thái duyệt đánh giá', enum: ReviewStatus, default: ReviewStatus.PENDING })
    @IsOptional()
    @IsEnum(ReviewStatus, { message: i18nValidationMessage('customer-review.validation.status_invalid') })
    status?: ReviewStatus;

    @ApiPropertyOptional({ description: 'Đánh dấu review nổi bật', default: false })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_featured_boolean') })
    is_featured?: boolean;

    @ApiPropertyOptional({ description: 'Thứ tự hiển thị', default: 0 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('customer-review.validation.display_order_integer') })
    @Min(0, { message: i18nValidationMessage('customer-review.validation.display_order_min') })
    display_order?: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_active_boolean') })
    is_active?: boolean;
}
