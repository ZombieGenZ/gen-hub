import { IsOptional, IsString, IsInt, Min, IsUUID, IsArray, IsEnum, IsNotEmpty, ValidateNested, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ContractStatus } from '@prisma/client';

/**
 * DTO cho mỗi template trong hợp đồng
 */
export class RentalTemplateItemDto {
    @ApiProperty({ description: 'ID template cần thuê', example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.template_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.template_id_uuid') })
    template_id: string;

    @ApiProperty({ description: 'Tên kho (dùng sau khi thanh toán)', example: 'Kho hàng A1' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.warehouse_name_required') })
    @IsString({ message: i18nValidationMessage('rental-contract.validation.warehouse_name_string') })
    @MaxLength(255, { message: i18nValidationMessage('rental-contract.validation.warehouse_name_max_length') })
    warehouse_name: string;

    @ApiPropertyOptional({ description: 'Mô tả kho', example: 'Kho chứa hàng điện tử' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.warehouse_description_string') })
    warehouse_description?: string;

    @ApiPropertyOptional({
        description: 'Danh sách ID row templates (bỏ trống = thuê cả kho)',
        example: ['550e8400-e29b-41d4-a716-446655440002'],
        type: [String]
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.row_template_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.row_template_id_uuid') })
    row_template_ids?: string[];
}

/**
 * DTO để tạo hợp đồng thuê mới
 */
export class CreateRentalContractDto {
    @ApiProperty({ description: 'ID của tổ chức thuê', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.organization_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.organization_id_uuid') })
    organization_id: string;

    @ApiProperty({
        description: 'Danh sách templates cần thuê',
        type: [RentalTemplateItemDto],
        example: [
            { template_id: 'uuid-1', warehouse_name: 'Kho A1', row_template_ids: [] },
            { template_id: 'uuid-2', warehouse_name: 'Kho B1', row_template_ids: ['row-1', 'row-2'] }
        ]
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.templates_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.templates_array') })
    @ValidateNested({ each: true })
    @Type(() => RentalTemplateItemDto)
    templates: RentalTemplateItemDto[];

    @ApiProperty({ description: 'Số tháng thuê (chỉ chấp nhận: 1,3,6,12,24,36)', example: 6, minimum: 1 })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.rental_months_required') })
    @IsInt({ message: i18nValidationMessage('rental-contract.validation.rental_months_positive') })
    @Min(1, { message: i18nValidationMessage('rental-contract.validation.rental_months_min') })
    rental_months: number;

    @ApiPropertyOptional({ description: 'Ghi chú cho hợp đồng', example: 'Thanh toán hàng tháng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.notes_string') })
    notes?: string;
}

/**
 * DTO để cập nhật hợp đồng (chỉ cho phép update name, notes, điều chỉnh thời gian)
 * Dành cho system-level endpoint
 */
export class UpdateRentalContractDto {
    @ApiPropertyOptional({ description: 'Tên hợp đồng mới', example: 'Hợp đồng thuê kho B2' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.name_string') })
    @MaxLength(255, { message: i18nValidationMessage('rental-contract.validation.name_max_length') })
    name?: string;

    @ApiPropertyOptional({ description: 'Ghi chú mới', example: 'Đã gia hạn thêm 3 tháng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.notes_string') })
    notes?: string;

    @ApiPropertyOptional({
        description: 'Số tháng điều chỉnh (dương = gia hạn, âm = giảm thời gian)',
        example: 3
    })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('rental-contract.validation.adjust_months_int') })
    adjust_months?: number;
}

/**
 * DTO để gia hạn hợp đồng (chỉ cho phép điều chỉnh thời gian)
 * Dành cho org-level endpoint - chỉ owner/member của org mới có thể gia hạn
 */
export class RenewRentalContractDto {
    @ApiProperty({
        description: 'Số tháng điều chỉnh (dương = gia hạn, âm = giảm thời gian)',
        example: 3
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.adjust_months_required') })
    @IsInt({ message: i18nValidationMessage('rental-contract.validation.adjust_months_int') })
    adjust_months: number;
}

/**
 * DTO query params cho danh sách hợp đồng
 */
export class QueryRentalContractDto {
    @ApiPropertyOptional({ description: 'Số lượng kết quả tối đa', example: 10, minimum: 1 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1, { message: i18nValidationMessage('rental-contract.validation.limit_positive') })
    limit?: number;

    @ApiPropertyOptional({ description: 'Vị trí bắt đầu (phân trang)', example: 0, minimum: 0 })
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(0, { message: i18nValidationMessage('rental-contract.validation.offset_min') })
    offset?: number;

    @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm', example: 'kho A' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.keywords_string') })
    keywords?: string;

    @ApiPropertyOptional({ description: 'Trạng thái hợp đồng', enum: ContractStatus, example: 'ACTIVE' })
    @IsOptional()
    @IsEnum(ContractStatus, { message: i18nValidationMessage('rental-contract.validation.status_invalid') })
    status?: ContractStatus;

    @ApiPropertyOptional({ description: 'Lọc theo ID tổ chức', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.organization_id_uuid') })
    organization_id?: string;
}
