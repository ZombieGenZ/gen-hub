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
    @ApiProperty({
        description: 'Tên khách hàng hoặc người đại diện gửi đánh giá',
        example: 'Nguyễn Văn An',
        minLength: 2,
    })
    @IsNotEmpty({ message: i18nValidationMessage('customer-review.validation.customer_name_required') })
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_name_string') })
    customer_name: string;

    @ApiPropertyOptional({
        description: 'Email liên hệ của khách hàng. Dùng để xác thực nguồn đánh giá hoặc liên hệ phản hồi khi cần.',
        example: 'an.nguyen@example.com',
    })
    @IsOptional()
    @IsEmail({}, { message: i18nValidationMessage('customer-review.validation.customer_email_invalid') })
    customer_email?: string;

    @ApiPropertyOptional({
        description: 'Số điện thoại của khách hàng theo định dạng hợp lệ quốc tế hoặc nội địa.',
        example: '+84901234567',
    })
    @IsOptional()
    @IsPhoneNumber(undefined, { message: i18nValidationMessage('customer-review.validation.customer_phone_invalid') })
    customer_phone?: string;

    @ApiPropertyOptional({
        description: 'Tên công ty hoặc tổ chức mà khách hàng đang công tác.',
        example: 'Công ty TNHH ABC Logistics',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_company_string') })
    customer_company?: string;

    @ApiPropertyOptional({
        description: 'Chức vụ của khách hàng trong công ty hoặc tổ chức.',
        example: 'Trưởng phòng vận hành',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_position_string') })
    customer_position?: string;

    @ApiPropertyOptional({
        description: 'Đường dẫn ảnh đại diện hiển thị cùng đánh giá trên giao diện người dùng.',
        example: 'https://cdn.example.com/avatar/customer-review-1.jpg',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.customer_avatar_string') })
    customer_avatar?: string;

    @ApiProperty({
        description: 'Điểm đánh giá từ 1 đến 5 sao, phản ánh mức độ hài lòng của khách hàng.',
        example: 5,
        minimum: 1,
        maximum: 5,
    })
    @IsInt({ message: i18nValidationMessage('customer-review.validation.rating_integer') })
    @Min(1, { message: i18nValidationMessage('customer-review.validation.rating_min') })
    @Max(5, { message: i18nValidationMessage('customer-review.validation.rating_max') })
    rating: number;

    @ApiPropertyOptional({
        description: 'Tiêu đề ngắn gọn tóm tắt nội dung đánh giá.',
        example: 'Dịch vụ rất chuyên nghiệp',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.title_string') })
    title?: string;

    @ApiProperty({
        description: 'Nội dung chi tiết của đánh giá khách hàng, có thể dùng để hiển thị công khai sau khi duyệt.',
        example: 'GEN-HUB hỗ trợ rất nhanh và quy trình thuê kho rõ ràng, minh bạch.',
    })
    @IsNotEmpty({ message: i18nValidationMessage('customer-review.validation.content_required') })
    @IsString({ message: i18nValidationMessage('customer-review.validation.content_string') })
    content: string;

    @ApiPropertyOptional({
        description: 'Phản hồi từ hệ thống hoặc nhân viên chăm sóc khách hàng dành cho đánh giá này.',
        example: 'Cảm ơn anh đã tin tưởng và sử dụng dịch vụ của GEN-HUB.',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('customer-review.validation.reply_string') })
    reply?: string;

    @ApiPropertyOptional({
        description: 'Trạng thái kiểm duyệt của đánh giá trước khi hiển thị ra bên ngoài.',
        enum: ReviewStatus,
        default: ReviewStatus.PENDING,
        example: ReviewStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(ReviewStatus, { message: i18nValidationMessage('customer-review.validation.status_invalid') })
    status?: ReviewStatus;

    @ApiPropertyOptional({
        description: 'Đánh dấu đánh giá nổi bật để ưu tiên hiển thị trên landing page hoặc trang giới thiệu.',
        default: false,
        example: false,
    })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_featured_boolean') })
    is_featured?: boolean;

    @ApiPropertyOptional({
        description: 'Thứ tự hiển thị thủ công. Số càng nhỏ thì ưu tiên hiển thị càng cao.',
        default: 0,
        example: 1,
        minimum: 0,
    })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('customer-review.validation.display_order_integer') })
    @Min(0, { message: i18nValidationMessage('customer-review.validation.display_order_min') })
    display_order?: number;

    @ApiPropertyOptional({
        description: 'Trạng thái hoạt động của đánh giá. Nếu tắt, đánh giá sẽ không được sử dụng ở các màn hình công khai.',
        default: true,
        example: true,
    })
    @IsOptional()
    @IsBoolean({ message: i18nValidationMessage('customer-review.validation.is_active_boolean') })
    is_active?: boolean;
}
