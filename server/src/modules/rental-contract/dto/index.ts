import { IsOptional, IsString, IsInt, Min, IsUUID, IsArray, IsEnum, IsNotEmpty, ValidateNested, MaxLength, IsBoolean, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ContractStatus, PaymentMethod, ContractCancelType } from '@prisma/client';

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

    @ApiPropertyOptional({ description: 'Mô tả nội dung chứa trong kho/row', example: 'Hàng điện tử, linh kiện máy tính' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.contents_description_string') })
    @MaxLength(1000, { message: i18nValidationMessage('rental-contract.validation.contents_description_max_length') })
    contents_description?: string;

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
 * DTO để tổ chức tạo hợp đồng thuê (không cần truyền organization_id)
 * POST /organizations/:orgId/rental-contracts
 */
export class OrgCreateRentalContractDto extends OmitType(CreateRentalContractDto, ['organization_id'] as const) { }



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
 * DTO để gia hạn hợp đồng
 * Dành cho org-level endpoint - chỉ owner/member của org mới có thể gia hạn
 */
export class RenewRentalContractDto {
    @ApiPropertyOptional({
        description: 'ID của gói thời hạn thuê để gia hạn (thêm thời gian)',
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
        description: 'Danh sách ID bảo hiểm được ủy quyền mua',
        type: [String],
        example: ['insurance-uuid-1']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.insurance_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.insurance_id_uuid') })
    insurance_ids?: string[];

    @ApiPropertyOptional({
        description: 'Danh sách mã coupon cần áp dụng cho đợt gia hạn',
        type: [String],
        example: ['RENEW20', 'VIP10']
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_array') })
    @IsString({ each: true, message: i18nValidationMessage('rental-contract.validation.coupon_code_string') })
    coupon_codes?: string[];
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

/**
 * DTO để thêm addon vào hợp đồng
 */
export class AddAddonDto {
    @ApiProperty({ description: 'ID của addon cần thêm', example: '550e8400-e29b-41d4-a716-446655440003' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.addon_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.addon_id_uuid') })
    addon_id: string;
}

/**
 * DTO để thêm nhiều addons vào hợp đồng
 */
export class AddAddonsDto {
    @ApiProperty({
        description: 'Danh sách ID các addon cần thêm',
        type: [String],
        example: ['uuid-1', 'uuid-2']
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.addon_ids_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.addon_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.addon_id_uuid') })
    addon_ids: string[];
}

/**
 * DTO để hủy addon từ hợp đồng
 */
export class RemoveAddonDto {
    @ApiProperty({ description: 'ID của rental_contract_addon cần hủy', example: '550e8400-e29b-41d4-a716-446655440004' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.contract_addon_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.contract_addon_id_uuid') })
    contract_addon_id: string;

    @ApiPropertyOptional({ description: 'Lý do hủy addon', example: 'Không cần sử dụng nữa' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_string') })
    @MaxLength(500, { message: i18nValidationMessage('rental-contract.validation.cancel_reason_max_length') })
    cancel_reason?: string;
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
 * DTO để áp dụng coupon vào hợp đồng
 */
export class ApplyCouponsDto {
    @ApiProperty({
        description: 'Danh sách mã coupon cần áp dụng',
        type: [String],
        example: ['SUMMER2024', 'NEWUSER10']
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_array') })
    @IsString({ each: true, message: i18nValidationMessage('rental-contract.validation.coupon_code_string') })
    coupon_codes: string[];
}

/**
 * DTO để validate coupons trước khi tạo/áp dụng
 */
export class ValidateCouponsDto {
    @ApiProperty({
        description: 'Danh sách mã coupon cần validate',
        type: [String],
        example: ['SUMMER2024', 'NEWUSER10']
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_array') })
    @IsString({ each: true, message: i18nValidationMessage('rental-contract.validation.coupon_code_string') })
    coupon_codes: string[];

    @ApiProperty({ description: 'Tổng giá trị đơn hàng', example: 5000000 })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.order_amount_required') })
    @IsInt({ message: i18nValidationMessage('rental-contract.validation.order_amount_int') })
    @Min(0, { message: i18nValidationMessage('rental-contract.validation.order_amount_min') })
    order_amount: number;

    @ApiPropertyOptional({ description: 'Số kho thuê', example: 2 })
    @IsOptional()
    @IsInt()
    @Min(0)
    warehouse_count?: number;

    @ApiPropertyOptional({ description: 'Số row thuê', example: 5 })
    @IsOptional()
    @IsInt()
    @Min(0)
    row_count?: number;

    @ApiPropertyOptional({ description: 'Số tháng thuê', example: 6 })
    @IsOptional()
    @IsInt()
    @Min(1)
    rental_months?: number;

    @ApiPropertyOptional({ description: 'Là hợp đồng mới hay gia hạn', example: true })
    @IsOptional()
    is_first_rental?: boolean;
}

/**
 * DTO để hủy hợp đồng của tổ chức (chỉ có cancel_reason, không có cancel_type)
 * cancel_type được tự động set là CLIENT_REQUEST
 */
export class OrgCancelContractDto {
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
 * DTO cho từng item trong org delete/many (chỉ có cancel_reason)
 */
export class OrgDeleteManyItemDto {
    @ApiProperty({ description: 'ID hợp đồng cần hủy', example: '550e8400-e29b-41d4-a716-446655440001' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.id_uuid') })
    id: string;

    @ApiProperty({ description: 'Lý do hủy hợp đồng', example: 'Không còn nhu cầu sử dụng' })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_required') })
    @IsString({ message: i18nValidationMessage('rental-contract.validation.cancel_reason_string') })
    @MaxLength(1000, { message: i18nValidationMessage('rental-contract.validation.cancel_reason_max_length_contract') })
    cancel_reason: string;
}

/**
 * DTO để hủy nhiều hợp đồng của tổ chức (mỗi item chỉ có cancel_reason)
 */
export class OrgDeleteManyWithReasonDto {
    @ApiProperty({
        description: 'Danh sách hợp đồng cần hủy với lý do cho từng item',
        type: [OrgDeleteManyItemDto],
        example: [
            { id: 'uuid-1', cancel_reason: 'Không còn nhu cầu' },
            { id: 'uuid-2', cancel_reason: 'Hết hợp đồng' }
        ]
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.items_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.items_array') })
    @ValidateNested({ each: true })
    @Type(() => OrgDeleteManyItemDto)
    items: OrgDeleteManyItemDto[];
}

/**
 * DTO extension for Swagger File Upload (Org Create)
 */
export class OrgCreateRentalContractWithFileDto extends OrgCreateRentalContractDto {
    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File hình ảnh chữ ký' })
    signature?: any;
}

/**
 * DTO extension for Swagger File Upload (Admin Create)
 */
export class AdminCreateRentalContractWithFileDto extends AdminCreateRentalContractDto {
    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File hình ảnh chữ ký' })
    signature?: any;
}

/**
 * DTO extension for Swagger File Upload (Renew)
 */
export class RenewRentalContractWithFileDto extends RenewRentalContractDto {
    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File hình ảnh chữ ký' })
    signature?: any;
}

