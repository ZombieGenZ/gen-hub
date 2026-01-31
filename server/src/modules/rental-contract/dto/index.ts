import { IsOptional, IsString, IsInt, Min, IsUUID, IsArray, IsEnum, IsNotEmpty, ValidateNested, MaxLength, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaymentMethod, ContractCancelType } from '@prisma/client';
import { RentalTemplateItemDto } from '../../rental-contract-shared/dto';

// Re-export shared DTOs
export * from '../../rental-contract-shared/dto';

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

    @ApiProperty({
        description: 'ID của gói thời hạn thuê (duration tier)',
        example: '550e8400-e29b-41d4-a716-446655440005'
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.duration_tier_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.duration_tier_id_uuid') })
    duration_tier_id: string;

    @ApiPropertyOptional({
        description: 'Phương thức thanh toán',
        enum: PaymentMethod,
        example: 'TRANSFER'
    })
    @IsOptional()
    @IsEnum(PaymentMethod, { message: i18nValidationMessage('rental-contract.validation.payment_method_invalid') })
    payment_method?: PaymentMethod;

    @ApiPropertyOptional({
        description: 'Tự động gia hạn bằng số dư tổ chức',
        example: false
    })
    @IsOptional()
    @IsBoolean()
    auto_renew?: boolean;

    @ApiPropertyOptional({
        description: 'Danh sách ID addon cần đăng ký cùng hợp đồng',
        type: [String],
        example: ['addon-uuid-1', 'addon-uuid-2']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.addon_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.addon_id_uuid') })
    addon_ids?: string[];

    @ApiPropertyOptional({
        description: 'Danh sách ID bảo hiểm được ủy quyền mua',
        type: [String],
        example: ['insurance-uuid-1']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.insurance_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.insurance_id_uuid') })
    insurance_ids?: string[];

    @ApiPropertyOptional({
        description: 'Danh sách mã coupon cần áp dụng',
        type: [String],
        example: ['SUMMER2024', 'NEWUSER10']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_array') })
    @IsString({ each: true, message: i18nValidationMessage('rental-contract.validation.coupon_code_string') })
    coupon_codes?: string[];

    @ApiPropertyOptional({ description: 'Ghi chú cho hợp đồng', example: 'Thanh toán hàng tháng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.notes_string') })
    notes?: string;

    @ApiPropertyOptional({
        description: 'Ngày bắt đầu thuê (có thể khác ngày thanh toán, giới hạn trong RENTAL_MAX_DELAYED_START_DAYS)',
        example: '2025-01-07T00:00:00.000Z'
    })
    @IsOptional()
    @Type(() => Date)
    @IsDate({ message: i18nValidationMessage('rental-contract.validation.scheduled_start_at_date') })
    scheduled_start_at?: Date;
}

/**
 * Loại thanh toán cho admin create contract
 */
export enum AdminPaymentType {
    TRANSFER = 'TRANSFER', // Quy trình bình thường - tạo link thanh toán
    CASH = 'CASH',         // Kích hoạt ngay lập tức (đã thanh toán tiền mặt)
}

/**
 * DTO để admin tạo hợp đồng
 * POST /admin/rental-contracts
 */
export class AdminCreateRentalContractDto extends CreateRentalContractDto {
    @ApiProperty({
        description: 'Loại thanh toán khi admin tạo hợp đồng',
        enum: AdminPaymentType,
        example: 'TRANSFER'
    })
    @IsNotEmpty()
    @IsEnum(AdminPaymentType, { message: i18nValidationMessage('rental-contract.validation.admin_payment_type_invalid') })
    type: AdminPaymentType;
}

/**
 * DTO để cập nhật hợp đồng
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
        description: 'ID gói thời hạn để gia hạn hợp đồng (thêm thời gian)',
        example: '550e8400-e29b-41d4-a716-446655440005'
    })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.duration_tier_id_uuid') })
    extend_duration_tier_id?: string;

    @ApiPropertyOptional({
        description: 'Số tháng giảm thời gian (số dương = giảm số tháng đó)',
        example: 2
    })
    @IsOptional()
    @IsInt({ message: i18nValidationMessage('rental-contract.validation.reduce_months_int') })
    @Min(1, { message: i18nValidationMessage('rental-contract.validation.reduce_months_min') })
    reduce_months?: number;

    @ApiPropertyOptional({
        description: 'Danh sách ID addon. Logic: ID mới → thêm, ID đang có → giữ, ID không có trong list → hủy',
        type: [String],
        example: ['addon-uuid-1', 'addon-uuid-2']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.addon_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.addon_id_uuid') })
    addon_ids?: string[];

    @ApiPropertyOptional({
        description: 'Danh sách ID bảo hiểm. Logic: ID mới → thêm, ID đang có → giữ, ID không có trong list → hủy',
        type: [String],
        example: ['insurance-uuid-1']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.insurance_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.insurance_id_uuid') })
    insurance_ids?: string[];
}

/**
 * DTO để hủy hợp đồng
 */
export class CancelContractDto {
    @ApiProperty({
        description: 'Loại hủy hợp đồng',
        enum: ContractCancelType,
        example: 'CLIENT_REQUEST'
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.cancel_type_required') })
    @IsEnum(ContractCancelType, { message: i18nValidationMessage('rental-contract.validation.cancel_type_invalid') })
    cancel_type: ContractCancelType;

    @ApiProperty({ description: 'Lý do hủy hợp đồng', example: 'Không còn nhu cầu sử dụng' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_required') })
    @IsString({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_string') })
    @MaxLength(1000, { message: i18nValidationMessage('rental-contract.validation.cancel_reason_max_length_contract') })
    cancel_reason: string;
}

/**
 * DTO cho từng item trong delete/many
 */
export class DeleteManyItemDto {
    @ApiProperty({ description: 'ID hợp đồng cần hủy', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.id_uuid') })
    id: string;

    @ApiProperty({
        description: 'Loại hủy hợp đồng',
        enum: ContractCancelType,
        example: 'CLIENT_REQUEST'
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.cancel_type_required') })
    @IsEnum(ContractCancelType, { message: i18nValidationMessage('rental-contract.validation.cancel_type_invalid') })
    cancel_type: ContractCancelType;

    @ApiProperty({ description: 'Lý do hủy hợp đồng', example: 'Không còn nhu cầu sử dụng' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_required') })
    @IsString({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_string') })
    @MaxLength(1000, { message: i18nValidationMessage('rental-contract.validation.cancel_reason_max_length_contract') })
    cancel_reason: string;
}

/**
 * DTO để hủy nhiều hợp đồng (mỗi item có cancel_type và cancel_reason riêng)
 */
export class DeleteManyWithReasonDto {
    @ApiProperty({
        description: 'Danh sách hợp đồng cần hủy với thông tin cancel cho từng item',
        type: [DeleteManyItemDto],
        example: [
            { id: 'uuid-1', cancel_type: 'CLIENT_REQUEST', cancel_reason: 'Không còn nhu cầu' },
            { id: 'uuid-2', cancel_type: 'VIOLATION', cancel_reason: 'Vi phạm quy định' }
        ]
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.items_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.items_array') })
    @ValidateNested({ each: true })
    @Type(() => DeleteManyItemDto)
    items: DeleteManyItemDto[];
}

/**
 * DTO extension for Swagger File Upload (Admin Create)
 */
export class AdminCreateRentalContractWithFileDto extends AdminCreateRentalContractDto {
    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File hình ảnh chữ ký' })
    signature?: any;
}
