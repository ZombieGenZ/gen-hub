import { IsOptional, IsString, IsNumber, IsBoolean, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO cho API get warehouse pricing
 * Hỗ trợ tìm kiếm nâng cao với nhiều filter
 */
export class GetWarehousePricingDto {
    @ApiPropertyOptional({ description: 'Tìm theo tên hoặc địa chỉ kho' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('coze-plugin.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Lọc theo tên tỉnh/thành (VD: "Hồ Chí Minh")' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('coze-plugin.validation.province_name_string') })
    province_name?: string;

    @ApiPropertyOptional({ description: 'Lọc theo code tỉnh/thành (VD: "79")' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('coze-plugin.validation.province_code_string') })
    province_code?: string;

    @ApiPropertyOptional({ description: 'Giá tối thiểu (VNĐ/tháng)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: i18nValidationMessage('coze-plugin.validation.min_price_number') })
    @Min(0, { message: i18nValidationMessage('coze-plugin.validation.min_price_positive') })
    min_price?: number;

    @ApiPropertyOptional({ description: 'Giá tối đa (VNĐ/tháng)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: i18nValidationMessage('coze-plugin.validation.max_price_number') })
    @Min(0, { message: i18nValidationMessage('coze-plugin.validation.max_price_positive') })
    max_price?: number;

    @ApiPropertyOptional({ description: 'Diện tích tối thiểu (m²)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: i18nValidationMessage('coze-plugin.validation.min_area_number') })
    @Min(0, { message: i18nValidationMessage('coze-plugin.validation.min_area_positive') })
    min_area?: number;

    @ApiPropertyOptional({ description: 'Diện tích tối đa (m²)' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: i18nValidationMessage('coze-plugin.validation.max_area_number') })
    @Min(0, { message: i18nValidationMessage('coze-plugin.validation.max_area_positive') })
    max_area?: number;

    @ApiPropertyOptional({ description: 'Lọc kho lạnh' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean({ message: i18nValidationMessage('coze-plugin.validation.is_cold_storage_boolean') })
    is_cold_storage?: boolean;

    @ApiPropertyOptional({ description: 'Lọc kho chia sẻ' })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean({ message: i18nValidationMessage('coze-plugin.validation.is_shared_warehouse_boolean') })
    is_shared_warehouse?: boolean;

    @ApiPropertyOptional({ description: 'ID kho cụ thể (nếu cần lấy chi tiết 1 kho)' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('coze-plugin.validation.warehouse_id_uuid') })
    warehouse_id?: string;

    @ApiPropertyOptional({ description: 'Giới hạn kết quả (default: 3)', default: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: i18nValidationMessage('coze-plugin.validation.limit_number') })
    @Min(1, { message: i18nValidationMessage('coze-plugin.validation.limit_positive') })
    limit?: number = 3;
}
