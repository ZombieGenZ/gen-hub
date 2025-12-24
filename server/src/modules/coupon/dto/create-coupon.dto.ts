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
    Max,
    ValidateIf,
    Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CouponDiscountType, DurationUnit } from '@prisma/client';
import { IsBeforeConstraint } from 'src/common/validators/is-before.validator';

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

    @ApiProperty({ description: 'Loại giảm giá', enum: CouponDiscountType })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.discount_type_required'),
    })
    @IsEnum(CouponDiscountType, {
        message: i18nValidationMessage('coupon.validation.discount_type_enum'),
    })
    discount_type: CouponDiscountType;

    @ApiProperty({ description: 'Giá trị giảm giá', example: 20 })
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.discount_value_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('coupon.validation.discount_value_number'),
    })
    @Min(1, {
        message: i18nValidationMessage('coupon.validation.discount_value_min'),
    })
    @ValidateIf(o => o.discount_type === 'PERCENT')
    @Max(100, {
        message: i18nValidationMessage('coupon.validation.discount_value_max_percent'),
    })
    discount_value: number;

    // Điều kiện: Số kho tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu số kho tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_warehouses?: boolean;

    @ApiPropertyOptional({ description: 'Số kho tối thiểu', example: 2 })
    @ValidateIf(o => o.require_min_warehouses === true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.min_warehouses_required'),
    })
    @IsInt()
    @Min(1)
    min_warehouses?: number;

    // Điều kiện: Số row tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu số row tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_rows?: boolean;

    @ApiPropertyOptional({ description: 'Số row tối thiểu', example: 10 })
    @ValidateIf(o => o.require_min_rows === true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.min_rows_required'),
    })
    @IsInt()
    @Min(1)
    min_rows?: number;

    // Điều kiện: Đơn hàng tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu đơn hàng tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_order_amount?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị đơn hàng tối thiểu', example: 1000000 })
    @ValidateIf(o => o.require_min_order_amount === true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.min_order_amount_required'),
    })
    @IsNumber()
    @Min(1)
    min_order_amount?: number;

    // Điều kiện: Thời gian thuê tối thiểu
    @ApiPropertyOptional({ description: 'Yêu cầu thời gian thuê tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_rental_duration?: boolean;

    @ApiPropertyOptional({ description: 'Thời gian thuê tối thiểu', example: 6 })
    @ValidateIf(o => o.require_min_rental_duration === true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.min_rental_duration_value_required'),
    })
    @IsInt()
    @Min(1)
    min_rental_duration_value?: number;

    @ApiPropertyOptional({ description: 'Đơn vị thời gian thuê', enum: DurationUnit })
    @ValidateIf(o => o.require_min_rental_duration === true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.min_rental_duration_unit_required'),
    })
    @IsEnum(DurationUnit)
    min_rental_duration_unit?: DurationUnit;

    // Giới hạn giảm giá (chỉ áp dụng cho PERCENT)
    @ApiPropertyOptional({ description: 'Không giới hạn giảm giá', default: false })
    @ValidateIf(o => o.discount_type === 'PERCENT')
    @IsOptional()
    @IsBoolean()
    is_unlimited_discount?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị giảm tối đa (cho PERCENT)', example: 500000 })
    @ValidateIf(o => o.discount_type === 'PERCENT' && o.is_unlimited_discount !== true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.max_discount_amount_required'),
    })
    @IsNumber()
    @Min(1)
    max_discount_amount?: number;

    // Thời gian hiệu lực
    @ApiPropertyOptional({ description: 'Coupon vĩnh viễn', default: false })
    @IsOptional()
    @IsBoolean()
    is_permanent?: boolean;

    @ApiPropertyOptional({ description: 'Thời gian bắt đầu' })
    @ValidateIf(o => o.is_permanent !== true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.starts_at_required'),
    })
    @Type(() => Date)
    @IsDate()
    @Validate(IsBeforeConstraint, ['ends_at'], {
        message: i18nValidationMessage('coupon.validation.starts_at_before_ends_at'),
    })
    starts_at?: Date;

    @ApiPropertyOptional({ description: 'Thời gian kết thúc' })
    @ValidateIf(o => o.is_permanent !== true)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.ends_at_required'),
    })
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

    @ApiPropertyOptional({ description: 'Áp dụng cho addon', default: false })
    @IsOptional()
    @IsBoolean()
    apply_for_addon?: boolean;

    @ApiPropertyOptional({ description: 'Áp dụng cho thuê toàn kho', default: true })
    @IsOptional()
    @IsBoolean()
    apply_for_whole_warehouse?: boolean;

    @ApiPropertyOptional({ description: 'Áp dụng cho thuê row', default: true })
    @IsOptional()
    @IsBoolean()
    apply_for_row?: boolean;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    // Stackability - Khả năng áp dụng chung với các coupon khác
    @ApiPropertyOptional({ description: 'Có thể áp dụng chung với vô hạn coupon khác', default: false })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('coupon.validation.is_unlimited_stack_boolean'),
    })
    is_unlimited_stack?: boolean;

    @ApiPropertyOptional({ description: 'Số coupon tối đa có thể áp dụng chung', example: 3 })
    @ValidateIf(o => o.is_unlimited_stack === false)
    @IsNotEmpty({
        message: i18nValidationMessage('coupon.validation.max_stack_count_required'),
    })
    @IsInt({
        message: i18nValidationMessage('coupon.validation.max_stack_count_int'),
    })
    @Min(1, {
        message: i18nValidationMessage('coupon.validation.max_stack_count_min'),
    })
    max_stack_count?: number;
}
