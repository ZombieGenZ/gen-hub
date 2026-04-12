import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class GetWarehousePricingDto {
  @ApiPropertyOptional({
    description: 'Tìm theo tên kho, địa chỉ hoặc từ khóa gợi nhớ.',
    example: 'Kho lạnh Bình Dương',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.keywords_string'),
  })
  keywords?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo tên tỉnh hoặc thành phố.',
    example: 'Hồ Chí Minh',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.province_name_string'),
  })
  province_name?: string;

  @ApiPropertyOptional({
    description:
      'Lọc theo mã tỉnh hoặc thành phố nếu hệ thống đã biết province code.',
    example: '79',
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('ai-plugin.validation.province_code_string'),
  })
  province_code?: string;

  @ApiPropertyOptional({
    description: 'Giá thuê tối thiểu theo VNĐ một tháng.',
    example: 10000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('ai-plugin.validation.min_price_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('ai-plugin.validation.min_price_positive'),
  })
  min_price?: number;

  @ApiPropertyOptional({
    description: 'Giá thuê tối đa theo VNĐ một tháng.',
    example: 30000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('ai-plugin.validation.max_price_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('ai-plugin.validation.max_price_positive'),
  })
  max_price?: number;

  @ApiPropertyOptional({
    description: 'Diện tích tối thiểu mong muốn theo mét vuông.',
    example: 200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('ai-plugin.validation.min_area_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('ai-plugin.validation.min_area_positive'),
  })
  min_area?: number;

  @ApiPropertyOptional({
    description: 'Diện tích tối đa mong muốn theo mét vuông.',
    example: 800,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('ai-plugin.validation.max_area_number') },
  )
  @Min(0, {
    message: i18nValidationMessage('ai-plugin.validation.max_area_positive'),
  })
  max_area?: number;

  @ApiPropertyOptional({
    description: 'Chỉ lấy kho lạnh nếu khách có nhu cầu bảo quản lạnh.',
    example: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({
    message: i18nValidationMessage(
      'ai-plugin.validation.is_cold_storage_boolean',
    ),
  })
  is_cold_storage?: boolean;

  @ApiPropertyOptional({
    description: 'Chỉ lấy kho chia sẻ nếu khách muốn thuê theo slot hoặc row.',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({
    message: i18nValidationMessage(
      'ai-plugin.validation.is_shared_warehouse_boolean',
    ),
  })
  is_shared_warehouse?: boolean;

  @ApiPropertyOptional({
    description: 'ID kho cụ thể nếu cần lấy thông tin của một kho duy nhất.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('ai-plugin.validation.warehouse_id_uuid'),
  })
  warehouse_id?: string;

  @ApiPropertyOptional({
    description: 'Giới hạn số lượng kết quả trả về cho AI tư vấn.',
    default: 3,
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    {},
    { message: i18nValidationMessage('ai-plugin.validation.limit_number') },
  )
  @Min(1, {
    message: i18nValidationMessage('ai-plugin.validation.limit_positive'),
  })
  limit?: number = 3;
}
