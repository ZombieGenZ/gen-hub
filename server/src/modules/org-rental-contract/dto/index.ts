import { IsOptional, IsString, IsInt, Min, IsUUID, IsArray, IsEnum, IsNotEmpty, ValidateNested, MaxLength, IsBoolean, IsDate } from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaymentMethod } from '@prisma/client';
import { RentalTemplateItemDto } from '../../rental-contract-shared/dto';

// Re-export shared DTOs
export * from '../../rental-contract-shared/dto';

// Copy Base Create DTO for logic reuse (or duplicate minimal needed)
// Để tránh duplicate code nhiều, tôi sẽ define lại CreateRentalContractDto ở đây hoặc import từ rental-contract. 
// Tốt nhất là duplicate những phần cơ bản để 2 module độc lập.

/**
 * DTO để tạo hợp đồng thuê mới (Base struct)
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
 *
 * Standalone class (không dùng OmitType) để tránh conflict metadata khi
 * class-transformer kế thừa @Transform từ parent qua OmitType.
 * Khi endpoint dùng multipart/form-data, tất cả field đều đến dưới dạng
 * string — @Transform cần được khai báo trực tiếp trên class này.
 */
export class OrgCreateRentalContractDto {
    @ApiProperty({
        description: 'Danh sách templates cần thuê (JSON string hoặc array)',
        type: [RentalTemplateItemDto],
    })
    @Transform(({ value }) => {
        let arr: unknown = value;
        if (typeof value === 'string') {
            try { arr = JSON.parse(value); } catch { return value; }
        }
        if (Array.isArray(arr)) {
            return arr.map((item: unknown) => plainToInstance(RentalTemplateItemDto, item));
        }
        return arr;
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.templates_required') })
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.templates_array') })
    @ValidateNested({ each: true })
    templates: RentalTemplateItemDto[];

    @ApiProperty({
        description: 'ID của gói thời hạn thuê',
        example: '550e8400-e29b-41d4-a716-446655440005',
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.duration_tier_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.duration_tier_id_uuid') })
    duration_tier_id: string;

    @ApiPropertyOptional({ description: 'Phương thức thanh toán', enum: PaymentMethod, example: 'TRANSFER' })
    @IsOptional()
    @IsEnum(PaymentMethod, { message: i18nValidationMessage('rental-contract.validation.payment_method_invalid') })
    payment_method?: PaymentMethod;

    @ApiPropertyOptional({ description: 'Tự động gia hạn', example: false })
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsOptional()
    @IsBoolean()
    auto_renew?: boolean;

    @ApiPropertyOptional({
        description: 'Thuế VAT (%) - mặc định 0%',
        example: 10
    })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        return typeof value === 'string' ? parseInt(value, 10) : value;
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    vat_rate?: number;

    @ApiPropertyOptional({ description: 'Danh sách ID addon', type: [String] })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.addon_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.addon_id_uuid') })
    addon_ids?: string[];

    @ApiPropertyOptional({ description: 'Danh sách ID bảo hiểm', type: [String] })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.insurance_ids_array') })
    @IsUUID('4', { each: true, message: i18nValidationMessage('rental-contract.validation.insurance_id_uuid') })
    insurance_ids?: string[];

    @ApiPropertyOptional({ description: 'Danh sách mã coupon', type: [String] })
    @Transform(({ value }) => {
        if (value === undefined || value === null) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsOptional()
    @IsArray({ message: i18nValidationMessage('rental-contract.validation.coupon_codes_array') })
    @IsString({ each: true, message: i18nValidationMessage('rental-contract.validation.coupon_code_string') })
    coupon_codes?: string[];

    @ApiPropertyOptional({ description: 'Ghi chú cho hợp đồng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('rental-contract.validation.notes_string') })
    notes?: string;

    @ApiPropertyOptional({
        description: 'Ngày bắt đầu thuê (ISO string)',
        example: '2025-01-07T00:00:00.000Z',
    })
    @Transform(({ value }) => {
        if (typeof value === 'string' && value) return new Date(value);
        return value;
    })
    @IsOptional()
    @IsDate({ message: i18nValidationMessage('rental-contract.validation.scheduled_start_at_date') })
    scheduled_start_at?: Date;
}

/**
 * DTO để gia hạn hợp đồng
 * Dành cho org-level endpoint - chỉ owner/member của org mới có thể gia hạn
 */
export class RenewRentalContractDto {
    @ApiProperty({
        description: 'ID của gói thời hạn thuê để gia hạn (thêm thời gian)',
        example: '550e8400-e29b-41d4-a716-446655440005'
    })
    @IsNotEmpty({ message: i18nValidationMessage('rental-contract.validation.duration_tier_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('rental-contract.validation.duration_tier_id_uuid') })
    duration_tier_id: string;

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
    @IsBoolean()
    is_first_rental?: boolean;
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
 * DTO extension for Swagger File Upload (Renew)
 */
export class RenewRentalContractWithFileDto extends RenewRentalContractDto {
    @ApiPropertyOptional({ type: 'string', format: 'binary', description: 'File hình ảnh chữ ký' })
    signature?: any;
}

/**
 * DTO để gửi hợp đồng qua DocuSign
 */
export class SendDocusignDto {
    @ApiProperty({
        description: 'URL để quay lại sau khi ký xong trên DocuSign',
        example: 'https://gen-hub.dev/docusign-callback'
    })
    @IsNotEmpty({ message: 'returnUrl là bắt buộc' })
    @IsString({ message: 'returnUrl phải là chuỗi' })
    returnUrl: string;
}
