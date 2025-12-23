import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsOptional,
    IsBoolean,
    IsNumber,
    IsEnum,
    IsInt,
    MaxLength,
    Min,
    Max,
    ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { CouponSchedulePeriod, CouponDiscountType, DurationUnit, CouponDurationUnit } from '@prisma/client';

/**
 * DTO tạo mới CouponSchedule
 */
export class CreateCouponScheduleDto {
    @ApiProperty({ description: 'Tên lịch tạo coupon', example: 'Khuyến mãi Tết hàng năm' })
    @IsNotEmpty({ message: i18nValidationMessage('coupon-schedule.validation.name_required') })
    @IsString({ message: i18nValidationMessage('coupon-schedule.validation.name_string') })
    @MaxLength(255, { message: i18nValidationMessage('coupon-schedule.validation.name_max_length') })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('coupon-schedule.validation.description_string') })
    description?: string;

    // Chu kỳ
    @ApiProperty({ description: 'Chu kỳ tạo coupon', enum: CouponSchedulePeriod })
    @IsNotEmpty({ message: i18nValidationMessage('coupon-schedule.validation.period_required') })
    @IsEnum(CouponSchedulePeriod, { message: i18nValidationMessage('coupon-schedule.validation.period_enum') })
    period: CouponSchedulePeriod;

    // Cấu hình thời gian chạy
    @ApiPropertyOptional({ description: 'Ngày trong tháng (1-31)', example: 15 })
    @ValidateIf(o => ['YEARLY', 'QUARTERLY', 'MONTHLY'].includes(o.period))
    @IsInt({ message: i18nValidationMessage('coupon-schedule.validation.scheduled_day_int') })
    @Min(1, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_day_min') })
    @Max(31, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_day_max') })
    scheduled_day?: number;

    @ApiPropertyOptional({ description: 'Tháng trong năm (1-12)', example: 1 })
    @ValidateIf(o => o.period === 'YEARLY')
    @IsInt({ message: i18nValidationMessage('coupon-schedule.validation.scheduled_month_int') })
    @Min(1, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_month_min') })
    @Max(12, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_month_max') })
    scheduled_month?: number;

    @ApiPropertyOptional({ description: 'Thứ trong tuần (0-6, 0=CN)', example: 1 })
    @ValidateIf(o => o.period === 'WEEKLY')
    @IsInt({ message: i18nValidationMessage('coupon-schedule.validation.scheduled_weekday_int') })
    @Min(0, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_weekday_min') })
    @Max(6, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_weekday_max') })
    scheduled_weekday?: number;

    @ApiPropertyOptional({ description: 'Giờ trong ngày (0-23)', example: 8 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('coupon-schedule.validation.scheduled_hour_int') })
    @Min(0, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_hour_min') })
    @Max(23, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_hour_max') })
    scheduled_hour?: number;

    @ApiPropertyOptional({ description: 'Phút (0-59)', example: 0 })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('coupon-schedule.validation.scheduled_minute_int') })
    @Min(0, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_minute_min') })
    @Max(59, { message: i18nValidationMessage('coupon-schedule.validation.scheduled_minute_max') })
    scheduled_minute?: number;

    // Cấu hình code
    @ApiPropertyOptional({ description: 'Code ngẫu nhiên', default: true })
    @IsOptional()
    @IsBoolean()
    is_random_code?: boolean;

    @ApiPropertyOptional({ description: 'Code cố định', default: false })
    @IsOptional()
    @IsBoolean()
    is_fixed_code?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị code cố định', example: 'TET' })
    @ValidateIf(o => o.is_fixed_code === true)
    @IsString({ message: i18nValidationMessage('coupon-schedule.validation.fixed_code_string') })
    @MaxLength(30, { message: i18nValidationMessage('coupon-schedule.validation.fixed_code_max_length') })
    fixed_code_value?: string;

    @ApiPropertyOptional({ description: 'Sử dụng suffix', default: false })
    @IsOptional()
    @IsBoolean()
    use_suffix?: boolean;

    @ApiPropertyOptional({ description: 'Sử dụng prefix', default: false })
    @IsOptional()
    @IsBoolean()
    use_prefix?: boolean;

    // Thời gian áp dụng Coupon
    @ApiPropertyOptional({ description: 'Coupon vĩnh viễn', default: false })
    @IsOptional()
    @IsBoolean()
    is_permanent_coupon?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị thời gian áp dụng', example: 1 })
    @ValidateIf(o => o.is_permanent_coupon !== true)
    @IsInt({ message: i18nValidationMessage('coupon-schedule.validation.coupon_duration_value_int') })
    @Min(1, { message: i18nValidationMessage('coupon-schedule.validation.coupon_duration_value_min') })
    coupon_duration_value?: number;

    @ApiPropertyOptional({ description: 'Đơn vị thời gian áp dụng', enum: CouponDurationUnit })
    @ValidateIf(o => o.is_permanent_coupon !== true)
    @IsEnum(CouponDurationUnit, { message: i18nValidationMessage('coupon-schedule.validation.coupon_duration_unit_enum') })
    coupon_duration_unit?: CouponDurationUnit;

    // Thông số Coupon
    @ApiProperty({ description: 'Giá trị giảm giá', example: 20 })
    @IsNotEmpty({ message: i18nValidationMessage('coupon-schedule.validation.discount_value_required') })
    @IsNumber({}, { message: i18nValidationMessage('coupon-schedule.validation.discount_value_number') })
    @Min(0, { message: i18nValidationMessage('coupon-schedule.validation.discount_value_min') })
    discount_value: number;

    @ApiProperty({ description: 'Loại giảm giá', enum: CouponDiscountType })
    @IsNotEmpty({ message: i18nValidationMessage('coupon-schedule.validation.discount_type_required') })
    @IsEnum(CouponDiscountType, { message: i18nValidationMessage('coupon-schedule.validation.discount_type_enum') })
    discount_type: CouponDiscountType;

    // Điều kiện
    @ApiPropertyOptional({ description: 'Yêu cầu số kho tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_warehouses?: boolean;

    @ApiPropertyOptional({ description: 'Số kho tối thiểu', example: 2 })
    @IsOptional()
    @IsInt()
    @Min(1)
    min_warehouses?: number;

    @ApiPropertyOptional({ description: 'Yêu cầu số row tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_rows?: boolean;

    @ApiPropertyOptional({ description: 'Số row tối thiểu', example: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    min_rows?: number;

    @ApiPropertyOptional({ description: 'Yêu cầu đơn hàng tối thiểu', default: false })
    @IsOptional()
    @IsBoolean()
    require_min_order_amount?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị đơn hàng tối thiểu', example: 1000000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    min_order_amount?: number;

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

    @ApiPropertyOptional({ description: 'Không giới hạn giảm giá', default: false })
    @IsOptional()
    @IsBoolean()
    is_unlimited_discount?: boolean;

    @ApiPropertyOptional({ description: 'Giá trị giảm tối đa (cho PERCENT)', example: 500000 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    max_discount_amount?: number;

    @ApiPropertyOptional({ description: 'Số lượng sử dụng tối đa (0 = không giới hạn)', default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    max_usage?: number;

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
