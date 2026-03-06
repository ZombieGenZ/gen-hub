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
    IsEnum,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PickingStrategy } from '../interfaces';

/**
 * DTO cho chi tiết sản phẩm trong yêu cầu xuất kho
 */
export class OutboundDetailDto {
    @ApiProperty({
        description: 'ID sản phẩm',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.product_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.product_id_uuid') })
    product_id: string;

    @ApiProperty({
        description: 'Số lượng xuất',
        example: 50,
        minimum: 0.0001,
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.quantity_required') })
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    @Min(0.0001, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    quantity: number;

    @ApiProperty({
        description: 'ID đơn vị tính',
        example: '550e8400-e29b-41d4-a716-446655440002',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.unit_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.unit_id_uuid') })
    unit_id: string;

    @ApiPropertyOptional({
        description: 'ID lô hàng yêu cầu (nếu muốn xuất từ lô cụ thể)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.batch_id_uuid') })
    required_batch_id?: string;
}

/**
 * DTO tạo yêu cầu xuất kho
 */
export class CreateOutboundRequestDto {
    @ApiProperty({
        description: 'ID kho',
        example: '550e8400-e29b-41d4-a716-446655440003',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.warehouse_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.warehouse_id_uuid') })
    warehouse_id: string;

    @ApiPropertyOptional({
        description: 'ID đối tác (khách hàng)',
        example: '550e8400-e29b-41d4-a716-446655440004',
    })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.partner_id_uuid') })
    partner_id?: string;

    @ApiPropertyOptional({
        description: 'Mã đơn bán hàng',
        example: 'SO-2026-001',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.sales_order_code_string') })
    sales_order_code?: string;

    @ApiPropertyOptional({
        description: 'Ghi chú',
        example: 'Xuất hàng cho khách hàng XYZ',
    })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.notes_string') })
    notes?: string;

    @ApiPropertyOptional({
        description: 'Ngày cần lấy hàng',
        example: '2026-03-15',
    })
    @IsOptional()
    @IsDateString()
    required_date?: string;

    @ApiPropertyOptional({
        description: 'Thông tin xe đến nhận',
    })
    @IsOptional()
    @IsString()
    vehicle_info?: string;

    @ApiPropertyOptional({
        description: 'Chiến lược xuất kho (FEFO: First Expired First Out, FIFO: First In First Out)',
        enum: PickingStrategy,
        default: PickingStrategy.FEFO,
        example: 'FEFO',
    })
    @IsOptional()
    @IsEnum(PickingStrategy, { message: i18nValidationMessage('inventory-request.validation.picking_strategy_enum') })
    picking_strategy?: PickingStrategy;

    @ApiProperty({
        description: 'Danh sách chi tiết sản phẩm xuất',
        type: [OutboundDetailDto],
    })
    @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
    @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
    @ValidateNested({ each: true })
    @Type(() => OutboundDetailDto)
    details: OutboundDetailDto[];
}
