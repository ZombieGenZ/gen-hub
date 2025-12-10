import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsBoolean,
    IsUUID,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Type } from 'class-transformer';
import { DimensionUnit } from '@prisma/client';

/**
 * DTO tạo mới WarehouseTemplate
 */
export class CreateWarehouseTemplateDto {
    @ApiProperty({ description: 'Tên template', example: 'Kho mẫu A' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.name_required'),
    })
    @IsString({
        message: i18nValidationMessage('warehouse-template.validation.name_string'),
    })
    @MaxLength(255, {
        message: i18nValidationMessage('warehouse-template.validation.name_max_length'),
    })
    name: string;

    @ApiPropertyOptional({ description: 'Mô tả', example: 'Template kho hàng tiêu chuẩn' })
    @IsOptional()
    @IsString({
        message: i18nValidationMessage('warehouse-template.validation.description_string'),
    })
    description?: string;

    @ApiProperty({ description: 'Đơn vị đo', enum: DimensionUnit, example: 'METER' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.unit_required'),
    })
    @IsEnum(DimensionUnit, {
        message: i18nValidationMessage('warehouse-template.validation.unit_invalid'),
    })
    unit: DimensionUnit;

    @ApiProperty({ description: 'Chiều dài', example: 100 })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.length_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.length_positive'),
    })
    @Min(1, {
        message: i18nValidationMessage('warehouse-template.validation.length_positive'),
    })
    @Type(() => Number)
    length: number;

    @ApiProperty({ description: 'Chiều rộng', example: 50 })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.width_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.width_positive'),
    })
    @Min(1, {
        message: i18nValidationMessage('warehouse-template.validation.width_positive'),
    })
    @Type(() => Number)
    width: number;

    @ApiProperty({ description: 'Giá thuê/ngày', example: 100000 })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.price_per_month_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.price_per_month_positive'),
    })
    @Min(0, {
        message: i18nValidationMessage('warehouse-template.validation.price_per_month_positive'),
    })
    @Type(() => Number)
    price_per_month: number;

    @ApiPropertyOptional({ description: 'Giảm giá 1 tháng (%)', example: 0, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    discount_1_month?: number;

    @ApiPropertyOptional({ description: 'Giảm giá 3 tháng (%)', example: 5, default: 5 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    discount_3_months?: number;

    @ApiPropertyOptional({ description: 'Giảm giá 6 tháng (%)', example: 10, default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    discount_6_months?: number;

    @ApiPropertyOptional({ description: 'Giảm giá 1 năm (%)', example: 15, default: 15 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    discount_1_year?: number;

    @ApiPropertyOptional({ description: 'Giảm giá 2 năm (%)', example: 20, default: 20 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    discount_2_years?: number;

    @ApiPropertyOptional({ description: 'Giảm giá 3 năm trở lên (%)', example: 25, default: 25 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    discount_3_years_plus?: number;

    @ApiPropertyOptional({ description: 'Giảm giá thuê toàn bộ kho (%)', example: 10, default: 10 })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Max(100, { message: i18nValidationMessage('warehouse-template.validation.discount_range') })
    @Type(() => Number)
    whole_warehouse_discount?: number;

    @ApiPropertyOptional({ description: 'Địa chỉ chi tiết' })
    @IsOptional()
    @IsString()
    address_detail?: string;

    @ApiPropertyOptional({ description: 'ID phường/xã' })
    @IsOptional()
    @IsUUID('4', {
        message: i18nValidationMessage('warehouse-template.validation.ward_id_uuid'),
    })
    ward_id?: string;

    @ApiPropertyOptional({ description: 'Vĩ độ', example: 10.762622 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.latitude_invalid'),
    })
    @Type(() => Number)
    latitude?: number;

    @ApiPropertyOptional({ description: 'Kinh độ', example: 106.660172 })
    @IsOptional()
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.longitude_invalid'),
    })
    @Type(() => Number)
    longitude?: number;

    @ApiProperty({ description: 'Đơn vị đo ô', enum: DimensionUnit, example: 'CENTIMETER' })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.block_unit_required'),
    })
    @IsEnum(DimensionUnit, {
        message: i18nValidationMessage('warehouse-template.validation.block_unit_invalid'),
    })
    block_unit: DimensionUnit;

    @ApiProperty({ description: 'Chiều dài ô', example: 50 })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.block_length_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.block_length_positive'),
    })
    @Min(0.01, {
        message: i18nValidationMessage('warehouse-template.validation.block_length_positive'),
    })
    @Type(() => Number)
    block_length: number;

    @ApiProperty({ description: 'Chiều rộng ô', example: 50 })
    @IsNotEmpty({
        message: i18nValidationMessage('warehouse-template.validation.block_width_required'),
    })
    @IsNumber({}, {
        message: i18nValidationMessage('warehouse-template.validation.block_width_positive'),
    })
    @Min(0.01, {
        message: i18nValidationMessage('warehouse-template.validation.block_width_positive'),
    })
    @Type(() => Number)
    block_width: number;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
    @IsOptional()
    @IsBoolean({
        message: i18nValidationMessage('warehouse-template.validation.is_active_boolean'),
    })
    is_active?: boolean;
}
