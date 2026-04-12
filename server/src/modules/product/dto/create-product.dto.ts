import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  IsUUID,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho ProductUnit khi tạo/cập nhật Product
 */
export class ProductUnitDto {
  @ApiProperty({ description: 'ID đơn vị tính', example: 'uuid' })
  @IsNotEmpty({
    message: i18nValidationMessage('product.validation.unit_id_required'),
  })
  @IsUUID('4', {
    message: i18nValidationMessage('product.validation.unit_id_uuid'),
  })
  unit_id: string;

  @ApiProperty({ description: 'Tỷ lệ quy đổi', example: 10 })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'product.validation.conversion_rate_required',
    ),
  })
  @IsNumber(
    {},
    {
      message: i18nValidationMessage(
        'product.validation.conversion_rate_number',
      ),
    },
  )
  @Min(0.0001, {
    message: i18nValidationMessage('product.validation.conversion_rate_min'),
  })
  conversion_rate: number;

  @ApiPropertyOptional({ description: 'Barcode cho đơn vị này' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('product.validation.barcode_string'),
  })
  barcode?: string;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Tên sản phẩm',
    example: 'Nước suối Aquafina 500ml',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('product.validation.name_required'),
  })
  @IsString({
    message: i18nValidationMessage('product.validation.name_string'),
  })
  @MaxLength(255, {
    message: i18nValidationMessage('product.validation.name_max_length'),
  })
  name: string;

  @ApiProperty({ description: 'Mã SKU', example: 'AQUA-500ML' })
  @IsNotEmpty({
    message: i18nValidationMessage('product.validation.sku_required'),
  })
  @IsString({ message: i18nValidationMessage('product.validation.sku_string') })
  @MaxLength(50, {
    message: i18nValidationMessage('product.validation.sku_max_length'),
  })
  sku: string;

  @ApiPropertyOptional({ description: 'Mô tả sản phẩm' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('product.validation.description_string'),
  })
  description?: string;

  @ApiPropertyOptional({ description: 'URL hình ảnh' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('product.validation.image_url_string'),
  })
  image_url?: string;

  @ApiPropertyOptional({ description: 'Barcode' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('product.validation.barcode_string'),
  })
  barcode?: string;

  @ApiPropertyOptional({ description: 'Trọng lượng (kg)' })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('product.validation.weight_number') },
  )
  @Min(0, { message: i18nValidationMessage('product.validation.weight_min') })
  weight?: number;

  @ApiPropertyOptional({ description: 'Chiều dài (cm)' })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('product.validation.length_number') },
  )
  @Min(0, { message: i18nValidationMessage('product.validation.length_min') })
  length?: number;

  @ApiPropertyOptional({ description: 'Chiều rộng (cm)' })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('product.validation.width_number') },
  )
  @Min(0, { message: i18nValidationMessage('product.validation.width_min') })
  width?: number;

  @ApiPropertyOptional({ description: 'Chiều cao (cm)' })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('product.validation.height_number') },
  )
  @Min(0, { message: i18nValidationMessage('product.validation.height_min') })
  height?: number;

  @ApiPropertyOptional({ description: 'Sức chịu tải tối đa (kg)' })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('product.validation.max_weight_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('product.validation.max_weight_min'),
  })
  max_weight_capacity?: number;

  @ApiPropertyOptional({ description: 'Giá vốn', default: 0 })
  @IsOptional()
  @IsNumber(
    {},
    { message: i18nValidationMessage('product.validation.cost_price_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('product.validation.cost_price_min'),
  })
  cost_price?: number;

  @ApiProperty({ description: 'ID đơn vị tính cơ bản' })
  @IsNotEmpty({
    message: i18nValidationMessage('product.validation.base_unit_id_required'),
  })
  @IsUUID('4', {
    message: i18nValidationMessage('product.validation.base_unit_id_uuid'),
  })
  base_unit_id: string;

  @ApiPropertyOptional({
    description: 'Danh sách đơn vị tính quy đổi',
    type: [ProductUnitDto],
  })
  @IsOptional()
  @IsArray({ message: i18nValidationMessage('product.validation.units_array') })
  @ValidateNested({ each: true })
  @Type(() => ProductUnitDto)
  units?: ProductUnitDto[];

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('product.validation.is_active_boolean'),
  })
  is_active?: boolean;
}
