import { IsOptional, IsString, IsBoolean, IsInt, Min, IsUUID, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO để tạo warehouse (thuê kho)
 */
export class CreateWarehouseDto {
    @ApiProperty({ description: 'ID template warehouse', example: 'uuid-template' })
    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.template_id_uuid') })
    template_id: string;

    @ApiProperty({ description: 'ID tổ chức', example: 'uuid-org' })
    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.organization_id_uuid') })
    organization_id: string;

    @ApiPropertyOptional({ description: 'Tên warehouse', example: 'Kho A' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả warehouse', example: 'Kho chứa hàng điện tử' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;

    @ApiPropertyOptional({ description: 'Danh sách ID các row cần thuê', example: ['uuid-row-1', 'uuid-row-2'] })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('warehouse.validation.row_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('warehouse.validation.row_id_uuid') })
    row_ids?: string[];

    @ApiProperty({ description: 'Số tháng thuê', example: 12 })
    @IsInt({ message: i18nValidationMessage('warehouse.validation.rental_months_positive') })
    @Min(1, { message: i18nValidationMessage('warehouse.validation.rental_months_min') })
    rental_months: number;

    @ApiPropertyOptional({ description: 'Ghi chú thêm', example: 'Cần hỗ trợ vận chuyển' })
    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * DTO để cập nhật warehouse (chỉ name/description)
 */
export class UpdateWarehouseDto {
    @ApiPropertyOptional({ description: 'Tên warehouse mới', example: 'Kho A - Mới' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả warehouse mới', example: 'Mô tả mới cho kho A' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;
}

/**
 * DTO query params cho danh sách warehouse
 */
export class QueryWarehouseDto {
    @ApiPropertyOptional({ description: 'Số lượng record mỗi trang', example: 10, default: 10 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1, { message: i18nValidationMessage('warehouse.validation.limit_positive') })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu', example: 0, default: 0 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(0, { message: i18nValidationMessage('warehouse.validation.offset_min') })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (tên, mô tả)', example: 'Kho' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hoạt động', example: true })
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean({ message: i18nValidationMessage('warehouse.validation.is_active_boolean') })
    is_active?: boolean;

    @ApiPropertyOptional({ description: 'Lọc theo ID tổ chức', example: 'uuid-org' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.organization_id_uuid') })
    organization_id?: string;
}

/**
 * DTO để cập nhật row
 */
export class UpdateRowDto {
    @ApiPropertyOptional({ description: 'Tên dãy mới', example: 'Dãy A - Mới' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả dãy mới', example: 'Mô tả mới cho dãy A' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;
}

/**
 * DTO để cập nhật rack
 */
export class UpdateRackDto {
    @ApiPropertyOptional({ description: 'Tên kệ mới', example: 'Kệ 01 - Mới' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả kệ mới', example: 'Mô tả mới cho kệ 01' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;
}

/**
 * DTO để cập nhật shelf (name, description, assigned_product_id)
 */
export class UpdateShelfDto {
    @ApiPropertyOptional({ description: 'Tên tầng mới', example: 'Tầng 1 - Mới' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả tầng mới', example: 'Mô tả mới' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;

    @ApiPropertyOptional({ description: 'ID sản phẩm gán vào tầng', example: 'uuid-product', nullable: true })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('warehouse.validation.product_id_uuid') })
    assigned_product_id?: string | null;
}

/**
 * DTO để cập nhật block
 */
export class UpdateBlockDto {
    @ApiPropertyOptional({ description: 'Tên ô mới', example: 'Ô 1 - Mới' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.name_string') })
    name?: string;

    @ApiPropertyOptional({ description: 'Mô tả ô mới', example: 'Mô tả mới cho ô 1' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('warehouse.validation.description_string') })
    description?: string;
}
