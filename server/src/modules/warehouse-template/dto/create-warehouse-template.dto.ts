import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEmail,
  IsArray,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';
import { CreateDiscountConfigDto } from './discount-config.dto';
import { WarehouseAddonGiftDto } from './warehouse-addon-gift.dto';
import { WarehouseInsuranceGiftDto } from './warehouse-insurance-gift.dto';

/**
 * DTO tạo mới WarehouseTemplate
 */
export class CreateWarehouseTemplateDto {
  @ApiProperty({ description: 'Tên template', example: 'Kho mẫu A' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.name_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage('warehouse-template.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage(
      'warehouse-template.validation.name_max_length',
    ),
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả',
    example: 'Template kho hàng tiêu chuẩn',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'warehouse-template.validation.description_string',
    ),
  })
  description?: string;

  @ApiProperty({ description: 'Chiều dài (mét)', example: 100 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.length_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.length_positive',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'warehouse-template.validation.length_positive',
    ),
  })
  @Type(() => Number)
  length: number;

  @ApiProperty({ description: 'Chiều rộng (mét)', example: 50 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.width_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.width_positive',
      ),
    },
  )
  @Min(1, {
    message: i18nValidationMessage(
      'warehouse-template.validation.width_positive',
    ),
  })
  @Type(() => Number)
  width: number;

  @ApiProperty({ description: 'Giá thuê/tháng (VND)', example: 100000 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.price_per_month_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.price_per_month_positive',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'warehouse-template.validation.price_per_month_positive',
    ),
  })
  @Type(() => Number)
  price_per_month: number;

  @ApiPropertyOptional({
    description: 'Danh sách config giảm giá theo mốc thời gian',
    type: [CreateDiscountConfigDto],
    example: [
      { duration_tier_id: 'uuid-tier-1', discount_percent: 0 },
      { duration_tier_id: 'uuid-tier-2', discount_percent: 5 },
      { duration_tier_id: 'uuid-tier-3', discount_percent: 10 },
    ],
  })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage(
      'warehouse-template.validation.discount_configs_array',
    ),
  })
  @ValidateNested({ each: true })
  @Type(() => CreateDiscountConfigDto)
  discount_configs?: CreateDiscountConfigDto[];

  @ApiPropertyOptional({
    description: 'Cho phép thuê theo từng row (shared warehouse)',
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'warehouse-template.validation.is_shared_warehouse_boolean',
    ),
  })
  is_shared_warehouse?: boolean;

  @ApiPropertyOptional({ description: 'Địa chỉ chi tiết' })
  @IsOptional()
  @IsString()
  address_detail?: string;

  @ApiPropertyOptional({ description: 'ID phường/xã' })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage(
      'warehouse-template.validation.ward_id_uuid',
    ),
  })
  ward_id?: string;

  @ApiPropertyOptional({ description: 'Vĩ độ', example: 10.762622 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.latitude_invalid',
      ),
    },
  )
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ description: 'Kinh độ', example: 106.660172 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.longitude_invalid',
      ),
    },
  )
  @Type(() => Number)
  longitude?: number;

  @ApiProperty({ description: 'Chiều dài ô (mét)', example: 0.5 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.block_length_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.block_length_positive',
      ),
    },
  )
  @Min(0.01, {
    message: i18nValidationMessage(
      'warehouse-template.validation.block_length_positive',
    ),
  })
  @Type(() => Number)
  block_length: number;

  @ApiProperty({ description: 'Chiều rộng ô (mét)', example: 0.5 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'warehouse-template.validation.block_width_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.block_width_positive',
      ),
    },
  )
  @Min(0.01, {
    message: i18nValidationMessage(
      'warehouse-template.validation.block_width_positive',
    ),
  })
  @Type(() => Number)
  block_width: number;

  // Thông tin người quản lý kho
  @ApiPropertyOptional({
    description: 'Tên người quản lý kho',
    example: 'Nguyễn Văn A',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'warehouse-template.validation.manager_name_string',
    ),
  })
  @MaxLength(255, {
    message: i18nValidationMessage(
      'warehouse-template.validation.manager_name_max_length',
    ),
  })
  manager_name?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại người quản lý',
    example: '0901234567',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage(
      'warehouse-template.validation.manager_phone_string',
    ),
  })
  @MaxLength(20, {
    message: i18nValidationMessage(
      'warehouse-template.validation.manager_phone_max_length',
    ),
  })
  manager_phone?: string;

  @ApiPropertyOptional({
    description: 'Email người quản lý',
    example: 'manager@example.com',
  })
  @IsOptional()
  @IsEmail(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.manager_email_invalid',
      ),
    },
  )
  manager_email?: string;

  // Thông số kỹ thuật
  @ApiPropertyOptional({ description: 'Chiều cao trần (mét)', example: 5.5 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.ceiling_height_positive',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'warehouse-template.validation.ceiling_height_positive',
    ),
  })
  @Type(() => Number)
  ceiling_height?: number;

  // Tiện ích
  @ApiPropertyOptional({
    description: 'Danh sách ID tiện ích',
    example: ['uuid1', 'uuid2'],
  })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage(
      'warehouse-template.validation.amenity_ids_array',
    ),
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage(
      'warehouse-template.validation.amenity_id_uuid',
    ),
  })
  amenity_ids?: string[];

  // Thông tin kho lạnh
  @ApiPropertyOptional({
    description: 'Đánh dấu là kho lạnh',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'warehouse-template.validation.is_cold_storage_boolean',
    ),
  })
  is_cold_storage?: boolean;

  @ApiPropertyOptional({ description: 'Nhiệt độ tối thiểu (°C)', example: -20 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.temperature_number',
      ),
    },
  )
  @Min(-100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.temperature_range',
    ),
  })
  @Max(100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.temperature_range',
    ),
  })
  @Type(() => Number)
  min_temperature?: number;

  @ApiPropertyOptional({ description: 'Nhiệt độ tối đa (°C)', example: 5 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.temperature_number',
      ),
    },
  )
  @Min(-100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.temperature_range',
    ),
  })
  @Max(100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.temperature_range',
    ),
  })
  @Type(() => Number)
  max_temperature?: number;

  @ApiPropertyOptional({ description: 'Độ ẩm tối thiểu (%)', example: 30 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.humidity_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'warehouse-template.validation.humidity_range',
    ),
  })
  @Max(100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.humidity_range',
    ),
  })
  @Type(() => Number)
  min_humidity?: number;

  @ApiPropertyOptional({ description: 'Độ ẩm tối đa (%)', example: 70 })
  @IsOptional()
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'warehouse-template.validation.humidity_number',
      ),
    },
  )
  @Min(0, {
    message: i18nValidationMessage(
      'warehouse-template.validation.humidity_range',
    ),
  })
  @Max(100, {
    message: i18nValidationMessage(
      'warehouse-template.validation.humidity_range',
    ),
  })
  @Type(() => Number)
  max_humidity?: number;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage(
      'warehouse-template.validation.is_active_boolean',
    ),
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Danh sách addon tặng kèm',
    type: [WarehouseAddonGiftDto],
  })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage(
      'warehouse-template.validation.addon_gifts_array',
    ),
  })
  @ValidateNested({ each: true })
  @Type(() => WarehouseAddonGiftDto)
  addon_gifts?: WarehouseAddonGiftDto[];

  @ApiPropertyOptional({
    description: 'Danh sách bảo hiểm tặng kèm',
    type: [WarehouseInsuranceGiftDto],
  })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage(
      'warehouse-template.validation.insurance_gifts_array',
    ),
  })
  @ValidateNested({ each: true })
  @Type(() => WarehouseInsuranceGiftDto)
  insurance_gifts?: WarehouseInsuranceGiftDto[];
}
