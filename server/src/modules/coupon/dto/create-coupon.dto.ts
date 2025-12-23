import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsEnum,
    IsInt,
    IsDate,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CouponDiscountType, DurationUnit } from '@prisma/client';

/**
 * DTO tạo mới Coupon
 */
export class CreateCouponDto {
    @ApiProperty({ description: 'Tên coupon', example: 'Khuyến mãi Tết 2025' })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('coupon.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('coupon.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Giảm 20% cho đơn hàng đầu tiên' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('coupon.validation.description_string'),
    })
    description?: string;

    @ApiProperty({ description: 'Mã coupon (unique khi is_deleted = false)', example: 'TET2025' })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.code_required'),
    })
    @IsString({
        message: i18nValidationMessage('coupon.validation.code_string'),
    })
    @MaxLength(50, {
        message: i18nValidationMessage('coupon.validation.code_max_length'),
    })
    code: string;

    @ApiProperty({ description: 'Giá trị giảm giá', example: 20 })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.discount_value_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('coupon.validation.discount_value_number'),
    })
    @Min(0, {
        message: i18nValidationMessage('coupon.validation.discount_value_min'),
    })
    discount_value: number;

    @ApiProperty({ description: 'Loại giảm giá', enum: CouponDiscountType })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.discount_type_required'),
    })
    @IsEnum(CouponDiscountType, {
        message: i18nValidationMessage('coupon.validation.discount_type_enum'),
    })
    discount_type: CouponDiscountType;

    // Điều kiện: Số kho tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu số kho tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_warehouses?: boolean;

    @ApiPropertyOptional({ description: 'Số kho tối thiểu', example: 2 })
    @IsOptional()
    @IsInt()
    @Min(1)
    min_warehouses?: number;

    // Điều kiện: Số row tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu số row tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_rows?: boolean;

    @ApiPropertyOptional({ description: 'Số row tối thiểu', example: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    min_rows?: number;

    // Điều kiện: Đơn hàng tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu đơn hàng tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_order_amount?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị đơn hàng tối thiểu', example: 1000000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    min_order_amount?: number;

    // Điều kiện: Thời gian thuê tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu thời gian thuê tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_rental_duration?: boolean;

    @ApiPropertyOptional({ description: 'Thời gian thuê tối thiểu', example: 6 })
    @IsOptional()
    @IsInt()
    @Min(1)
    min_rental_duration_value?: number;

    @ApiPropertyOptional({ description: 'Đơn vị thời gian thuê', enum: DurationUnit })
    @IsOptional()
    @IsEnum(DurationUnit)
    min_rental_duration_unit?: DurationUnit;

    // Giới hạn giảm giá
    @ApiPropertyOptional({ description: 'Không giới hạn giảm giá', default: false })
    @IsOptional()
    @IsBoolean()
    is_unlimited_discount?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị giảm tối đa (cho PERCENT)', example: 500000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    max_discount_amount?: number;

    // Thời gian hiệu lực
    @ApiPropertyOptional({ description: 'Coupon vĩnh viễn', default: false })
    @IsOptional()
    @IsBoolean()
    is_permanent?: boolean;

    @ApiPropertyOptional({ description: 'Thời gian bắt đầu' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    starts_at?: Date;

    @ApiPropertyOptional({ description: 'Thời gian kết thúc' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    ends_at?: Date;

    // Số lượng sử dụng
    @ApiPropertyOptional({ description: 'Số lượng tối đa (0 = không giới hạn)', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    max_usage?: number;

    // Công khai và áp dụng
    @ApiPropertyOptional({ description: 'Coupon công khai', default: false })
    @IsOptional()
    @IsBoolean()
    is_public?: boolean;

    @ApiPropertyOptional({ description: 'Áp dụng cho thuê lần đầu', default: true })
    @IsOptional()
    @IsBoolean()
    apply_for_first_rental?: boolean;

    @ApiPropertyOptional({ description: 'Áp dụng cho gia hạn', default: true })
    @IsOptional()
    @IsBoolean()
    apply_for_renewal?: boolean;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
