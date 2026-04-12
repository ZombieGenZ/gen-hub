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
  IsArray,
  IsUUID,
  ArrayMinSize,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import {
  CouponSchedulePeriod,
  CouponDiscountType,
  DurationUnit,
  CouponDurationUnit,
  CouponType,
} from '@prisma/client';

/**
 * DTO tạo mới CouponSchedule
 */
export class CreateCouponScheduleDto {
  @ApiProperty({
    description: 'Tên lịch tạo coupon',
    example: 'Khuyến mãi Tết hàng năm',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('coupon-schedule.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('coupon-schedule.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.name_max_length',
    ),
  })
  name: string;

  @ApiPropertyOptional({ description: 'Mô tả' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'coupon-schedule.validation.description_string',
    ),
  })
  description?: string;

  // Chu kỳ
  @ApiProperty({ description: 'Chu kỳ tạo coupon', enum: CouponSchedulePeriod })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.period_required',
    ),
  })
  @IsEnum(CouponSchedulePeriod, {
    message: i18nValidationMessage('coupon-schedule.validation.period_enum'),
  })
  period: CouponSchedulePeriod;

  // Loại coupon sẽ tạo: PUBLIC hoặc PRIVATE
  @ApiPropertyOptional({
    description: 'Loại coupon sẽ tạo',
    enum: CouponType,
    default: 'PUBLIC',
  })
  @IsOptional()
  @IsEnum(CouponType, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.coupon_type_enum',
    ),
  })
  coupon_type?: CouponType;

  // Cấu hình thời gian chạy theo period
  @ApiPropertyOptional({ description: 'Ngày trong tháng (1-31)', example: 15 })
  @ValidateIf((o) => ['YEARLY', 'QUARTERLY', 'MONTHLY'].includes(o.period))
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_day_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_day_int',
    ),
  })
  @Min(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_day_min',
    ),
  })
  @Max(31, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_day_max',
    ),
  })
  scheduled_day?: number;

  @ApiPropertyOptional({ description: 'Tháng trong năm (1-12)', example: 1 })
  @ValidateIf((o) => ['YEARLY', 'QUARTERLY'].includes(o.period))
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_month_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_month_int',
    ),
  })
  @Min(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_month_min',
    ),
  })
  @Max(12, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_month_max',
    ),
  })
  scheduled_month?: number;

  @ApiPropertyOptional({
    description: 'Thứ trong tuần (0-6, 0=CN)',
    example: 1,
  })
  @ValidateIf((o) => o.period === 'WEEKLY')
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_weekday_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_weekday_int',
    ),
  })
  @Min(0, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_weekday_min',
    ),
  })
  @Max(6, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_weekday_max',
    ),
  })
  scheduled_weekday?: number;

  @ApiPropertyOptional({ description: 'Giờ trong ngày (0-23)', example: 8 })
  @ValidateIf((o) => o.period === 'DAILY')
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_hour_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_hour_int',
    ),
  })
  @Min(0, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_hour_min',
    ),
  })
  @Max(23, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_hour_max',
    ),
  })
  scheduled_hour?: number;

  @ApiPropertyOptional({ description: 'Phút (0-59)', example: 0 })
  @ValidateIf((o) => o.period === 'DAILY')
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_minute_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_minute_int',
    ),
  })
  @Min(0, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_minute_min',
    ),
  })
  @Max(59, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.scheduled_minute_max',
    ),
  })
  scheduled_minute?: number;

  // Cấu hình code
  @ApiPropertyOptional({ description: 'Code ngẫu nhiên', default: true })
  @IsOptional()
  @IsBoolean()
  is_random_code?: boolean;

  // Các trường chỉ áp dụng khi is_random_code = false
  @ApiPropertyOptional({ description: 'Code cố định', default: false })
  @ValidateIf((o) => o.is_random_code === false)
  @IsOptional()
  @IsBoolean()
  is_fixed_code?: boolean;

  @ApiPropertyOptional({ description: 'Giá trị code cố định', example: 'TET' })
  @ValidateIf((o) => o.is_random_code === false)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.fixed_code_value_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage(
      'coupon-schedule.validation.fixed_code_string',
    ),
  })
  @MaxLength(30, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.fixed_code_max_length',
    ),
  })
  fixed_code_value?: string;

  @ApiPropertyOptional({ description: 'Sử dụng suffix', default: false })
  @ValidateIf((o) => o.is_random_code === false)
  @IsOptional()
  @IsBoolean()
  use_suffix?: boolean;

  @ApiPropertyOptional({ description: 'Sử dụng prefix', default: false })
  @ValidateIf((o) => o.is_random_code === false)
  @IsOptional()
  @IsBoolean()
  use_prefix?: boolean;

  // Thời gian áp dụng Coupon
  @ApiPropertyOptional({ description: 'Coupon vĩnh viễn', default: false })
  @IsOptional()
  @IsBoolean()
  is_permanent_coupon?: boolean;

  @ApiPropertyOptional({ description: 'Giá trị thời gian áp dụng', example: 1 })
  @ValidateIf((o) => o.is_permanent_coupon !== true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.coupon_duration_value_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.coupon_duration_value_int',
    ),
  })
  @Min(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.coupon_duration_value_min',
    ),
  })
  coupon_duration_value?: number;

  @ApiPropertyOptional({
    description: 'Đơn vị thời gian áp dụng',
    enum: CouponDurationUnit,
  })
  @ValidateIf((o) => o.is_permanent_coupon !== true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.coupon_duration_unit_required',
    ),
  })
  @IsEnum(CouponDurationUnit, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.coupon_duration_unit_enum',
    ),
  })
  coupon_duration_unit?: CouponDurationUnit;

  // Thông số Coupon - discount_type trước discount_value
  @ApiProperty({ description: 'Loại giảm giá', enum: CouponDiscountType })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.discount_type_required',
    ),
  })
  @IsEnum(CouponDiscountType, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.discount_type_enum',
    ),
  })
  discount_type: CouponDiscountType;

  @ApiProperty({ description: 'Giá trị giảm giá', example: 20 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.discount_value_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'coupon-schedule.validation.discount_value_number',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.discount_value_min',
    ),
  })
  @ValidateIf((o) => o.discount_type === 'PERCENT')
  @Max(100, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.discount_value_max_percent',
    ),
  })
  discount_value: number;

  // Điều kiện: Số kho tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu số kho tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_warehouses?: boolean;

  @ApiPropertyOptional({ description: 'Số kho tối thiểu', example: 2 })
  @ValidateIf((o) => o.require_min_warehouses === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.min_warehouses_required',
    ),
  })
  @IsInt()
  @Min(1)
  min_warehouses?: number;

  // Điều kiện: Số row tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu số row tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_rows?: boolean;

  @ApiPropertyOptional({ description: 'Số row tối thiểu', example: 10 })
  @ValidateIf((o) => o.require_min_rows === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.min_rows_required',
    ),
  })
  @IsInt()
  @Min(1)
  min_rows?: number;

  // Điều kiện: Đơn hàng tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu đơn hàng tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_order_amount?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu',
    example: 1000000,
  })
  @ValidateIf((o) => o.require_min_order_amount === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.min_order_amount_required',
    ),
  })
  @IsNumber()
  @Min(1)
  min_order_amount?: number;

  // Điều kiện: Thời gian thuê tối thiểu
  @ApiPropertyOptional({
    description: 'Yêu cầu thời gian thuê tối thiểu',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  require_min_rental_duration?: boolean;

  @ApiPropertyOptional({ description: 'Thời gian thuê tối thiểu', example: 6 })
  @ValidateIf((o) => o.require_min_rental_duration === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.min_rental_duration_value_required',
    ),
  })
  @IsInt()
  @Min(1)
  min_rental_duration_value?: number;

  @ApiPropertyOptional({
    description: 'Đơn vị thời gian thuê',
    enum: DurationUnit,
  })
  @ValidateIf((o) => o.require_min_rental_duration === true)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.min_rental_duration_unit_required',
    ),
  })
  @IsEnum(DurationUnit)
  min_rental_duration_unit?: DurationUnit;

  // Giới hạn giảm giá (chỉ áp dụng cho PERCENT)
  @ApiPropertyOptional({
    description: 'Không giới hạn giảm giá',
    default: false,
  })
  @ValidateIf((o) => o.discount_type === 'PERCENT')
  @IsOptional()
  @IsBoolean()
  is_unlimited_discount?: boolean;

  @ApiPropertyOptional({
    description: 'Giá trị giảm tối đa (cho PERCENT)',
    example: 500000,
  })
  @ValidateIf(
    (o) => o.discount_type === 'PERCENT' && o.is_unlimited_discount !== true,
  )
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.max_discount_amount_required',
    ),
  })
  @IsNumber()
  @Min(1)
  max_discount_amount?: number;

  @ApiPropertyOptional({
    description: 'Số lượng sử dụng tối đa (0 = không giới hạn)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  max_usage?: number;

  @ApiPropertyOptional({ description: 'Coupon công khai', default: false })
  @IsOptional()
  @IsBoolean()
  is_public?: boolean;

  @ApiPropertyOptional({
    description: 'Áp dụng cho thuê lần đầu',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  apply_for_first_rental?: boolean;

  @ApiPropertyOptional({ description: 'Áp dụng cho gia hạn', default: true })
  @IsOptional()
  @IsBoolean()
  apply_for_renewal?: boolean;

  // Cờ áp dụng cho tất cả
  @ApiPropertyOptional({ description: 'Áp dụng cho tất cả kho', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'coupon-schedule.validation.apply_for_all_warehouses_boolean',
    ),
  })
  apply_for_all_warehouses?: boolean;

  @ApiPropertyOptional({ description: 'Áp dụng cho tất cả row', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'coupon-schedule.validation.apply_for_all_rows_boolean',
    ),
  })
  apply_for_all_rows?: boolean;

  @ApiPropertyOptional({
    description: 'Áp dụng cho tất cả addon',
    default: true,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'coupon-schedule.validation.apply_for_all_addons_boolean',
    ),
  })
  apply_for_all_addons?: boolean;

  // Target arrays
  @ApiPropertyOptional({
    description:
      'Danh sách ID user được áp dụng (chỉ dùng khi coupon_type = PRIVATE)',
    type: [String],
  })
  @ValidateIf((o) => o.coupon_type === 'PRIVATE')
  @IsArray({
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_user_ids_array',
    ),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_user_ids_required',
    ),
  })
  @IsUUID('4', { each: true })
  target_user_ids?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách ID warehouse template được áp dụng',
    type: [String],
  })
  @ValidateIf((o) => o.apply_for_all_warehouses === false)
  @IsArray({
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_warehouse_ids_array',
    ),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_warehouse_ids_required',
    ),
  })
  @IsUUID('4', { each: true })
  target_warehouse_ids?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách ID row template được áp dụng',
    type: [String],
  })
  @ValidateIf((o) => o.apply_for_all_rows === false)
  @IsArray({
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_row_ids_array',
    ),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_row_ids_required',
    ),
  })
  @IsUUID('4', { each: true })
  target_row_ids?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách ID addon được áp dụng',
    type: [String],
  })
  @ValidateIf((o) => o.apply_for_all_addons === false)
  @IsArray({
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_addon_ids_array',
    ),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.target_addon_ids_required',
    ),
  })
  @IsUUID('4', { each: true })
  target_addon_ids?: string[];

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // Stackability - Khả năng áp dụng chung với các coupon khác
  @ApiPropertyOptional({
    description: 'Có thể áp dụng chung với vô hạn coupon khác',
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'coupon-schedule.validation.is_unlimited_stack_boolean',
    ),
  })
  is_unlimited_stack?: boolean;

  @ApiPropertyOptional({
    description: 'Số coupon tối đa có thể áp dụng chung',
    example: 3,
  })
  @ValidateIf((o) => o.is_unlimited_stack === false)
  @IsNotEmpty({
    message: i18nValidationMessage(
      'coupon-schedule.validation.max_stack_count_required',
    ),
  })
  @IsInt({
    message: i18nValidationMessage(
      'coupon-schedule.validation.max_stack_count_int',
    ),
  })
  @Min(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.max_stack_count_min',
    ),
  })
  max_stack_count?: number;

  // Gift Addons - Tặng kèm addon
  @ApiPropertyOptional({ description: 'Có tặng kèm addon', default: false })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'coupon-schedule.validation.has_gift_addons_boolean',
    ),
  })
  has_gift_addons?: boolean;

  @ApiPropertyOptional({
    description: 'Danh sách ID addon được tặng kèm',
    type: [String],
  })
  @ValidateIf((o) => o.has_gift_addons === true)
  @IsArray({
    message: i18nValidationMessage(
      'coupon-schedule.validation.gift_addon_ids_array',
    ),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.gift_addon_ids_required',
    ),
  })
  @IsUUID('4', { each: true })
  gift_addon_ids?: string[];

  // Gift Insurances - Tặng kèm bảo hiểm
  @ApiPropertyOptional({ description: 'Có tặng kèm bảo hiểm', default: false })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'coupon-schedule.validation.has_gift_insurances_boolean',
    ),
  })
  has_gift_insurances?: boolean;

  @ApiPropertyOptional({
    description: 'Danh sách ID bảo hiểm được tặng kèm',
    type: [String],
  })
  @ValidateIf((o) => o.has_gift_insurances === true)
  @IsArray({
    message: i18nValidationMessage(
      'coupon-schedule.validation.gift_insurance_ids_array',
    ),
  })
  @ArrayMinSize(1, {
    message: i18nValidationMessage(
      'coupon-schedule.validation.gift_insurance_ids_required',
    ),
  })
  @IsUUID('4', { each: true })
  gift_insurance_ids?: string[];
}
