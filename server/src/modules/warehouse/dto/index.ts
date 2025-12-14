import { IsOptional, IsString, IsBoolean, IsInt, Min, IsUUID, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO để tạo warehouse (thuê kho)
 */
export class CreateWarehouseDto {
    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.template_id_uuid') })
    template_id: string;

    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.organization_id_uuid') })
    organization_id: string;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;

    @IsOptional()
    @IsArray({ message: i18nValidationMessage('warehouse.validation.row_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('warehouse.validation.row_id_uuid') })
    row_ids?: string[];

    @IsInt({ message: i18nValidationMessage('warehouse.validation.rental_months_positive') })
    @Min(1, { message: i18nValidationMessage('warehouse.validation.rental_months_min') })
    rental_months: number;

    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * DTO để cập nhật warehouse (chỉ name/description)
 */
export class UpdateWarehouseDto {
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;
}

/**
 * DTO query params cho danh sách warehouse
 */
export class QueryWarehouseDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1, { message: i18nValidationMessage('warehouse.validation.limit_positive') })
    limit?: number;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(0, { message: i18nValidationMessage('warehouse.validation.offset_min') })
    offset?: number;

    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.keywords_string') })
    keywords?: string;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean({ message: i18nValidationMessage('warehouse.validation.is_active_boolean') })
    is_active?: boolean;

    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.organization_id_uuid') })
    organization_id?: string;
}
