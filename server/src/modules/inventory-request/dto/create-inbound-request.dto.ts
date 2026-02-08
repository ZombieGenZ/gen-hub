import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsUUID,
    IsArray,
    ArrayMinSize,
    ValidateNested,
    IsOptional,
    IsString,
    IsNumber,
    Min,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cho chi tiết sản phẩm trong yêu cầu nhập kho
 */
export class InboundDetailDto {
    @ApiProperty({
        description: 'ID sản phẩm',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.product_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.product_id_uuid') })
    product_id: string;

    @ApiPropertyOptional({
        description: 'ID lô hàng (nếu nhập vào lô hiện có)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.batch_id_uuid') })
    batch_id?: string;

    @ApiProperty({
        description: 'Số lượng dự kiến nhập',
        example: 100,
        minimum: 0.0001,
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.quantity_required') })
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    @Min(0.0001, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    expected_qty: number;

    @ApiProperty({
        description: 'ID đơn vị tính',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.unit_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.unit_id_uuid') })
    unit_id: string;

    // Thông tin để tạo batch mới (nếu không có batch_id)
    @ApiPropertyOptional({
        description: 'Mã lô hàng mới (bắt buộc nếu không có batch_id)',
        example: 'LOT-2026-001',
    })
    @IsOptional()
    @IsString()
    batch_code?: string;

    @ApiPropertyOptional({
        description: 'Ngày sản xuất',
        example: '2026-01-15',
    })
    @IsOptional()
    @IsDateString({}, { message: i18nValidationMessage('inventory-request.validation.manufacturing_date_date') })
    manufacturing_date?: string;

    @ApiPropertyOptional({
        description: 'Hạn sử dụng',
        example: '2027-01-15',
    })
    @IsOptional()
    @IsDateString({}, { message: i18nValidationMessage('inventory-request.validation.expiry_date_date') })
    expiry_date?: string;

    @ApiPropertyOptional({
        description: 'Giá nhập',
        example: 50000,
        minimum: 0,
    })
    @IsOptional()
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.import_price_positive') })
    @Min(0, { message: i18nValidationMessage('inventory-request.validation.import_price_positive') })
    import_price?: number;
}

/**
 * DTO tạo yêu cầu nhập kho
 */
export class CreateInboundRequestDto {
    @ApiProperty({
        description: 'ID kho',
        example: '550e8400-e29b-41d4-a716-446655440003',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.warehouse_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.warehouse_id_uuid') })
    warehouse_id: string;

    @ApiPropertyOptional({
        description: 'ID đối tác (nhà cung cấp)',
        example: '550e8400-e29b-41d4-a716-446655440004',
    })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.partner_id_uuid') })
    partner_id?: string;

    @ApiPropertyOptional({
        description: 'Mã đơn mua hàng',
        example: 'PO-2026-001',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.purchase_order_code_string') })
    purchase_order_code?: string;

    @ApiPropertyOptional({
        description: 'Ghi chú',
        example: 'Nhập hàng từ nhà cung cấp ABC',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.notes_string') })
    notes?: string;

    @ApiProperty({
        description: 'Danh sách chi tiết sản phẩm nhập',
        type: [InboundDetailDto],
    })
    @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
    @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
    @ValidateNested({ each: true })
    @Type(() => InboundDetailDto)
    details: InboundDetailDto[];
}
