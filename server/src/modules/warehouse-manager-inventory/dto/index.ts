import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsInt,
    Min,
    IsEnum,
    IsArray,
    ArrayMinSize,
    ValidateNested,
    IsUUID,
    IsNumber,
    IsNotEmpty,
    IsBoolean,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ReceiptStatus, ExportStatus } from '@prisma/client';
import { PickingStrategy } from '../../inventory-request/interfaces';

/**
 * DTO query danh sách pending inbound
 */
export class QueryPendingInboundDto {
    @ApiPropertyOptional({
        description: 'ID kho (lọc theo kho)',
        example: '550e8400-e29b-41d4-a716-446655440003',
    })
    @IsOptional()
    @IsString()
    warehouse_id?: string;

    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm',
        example: 'PN-2026',
    })
    @IsOptional()
    @IsString()
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Số lượng bản ghi trên trang',
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Vị trí bắt đầu',
        default: 0,
        minimum: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;
}

/**
 * DTO query danh sách pending outbound
 */
export class QueryPendingOutboundDto {
    @ApiPropertyOptional({
        description: 'ID kho (lọc theo kho)',
        example: '550e8400-e29b-41d4-a716-446655440003',
    })
    @IsOptional()
    @IsString()
    warehouse_id?: string;

    @ApiPropertyOptional({
        description: 'Từ khóa tìm kiếm',
        example: 'PX-2026',
    })
    @IsOptional()
    @IsString()
    keywords?: string;

    @ApiPropertyOptional({
        description: 'Số lượng bản ghi trên trang',
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Vị trí bắt đầu',
        default: 0,
        minimum: 0,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    offset?: number = 0;
}

/**
 * DTO chi tiết số lượng thực tế cho approve inbound
 */
export class ActualQuantityDetailDto {
    @ApiProperty({
        description: 'ID chi tiết phiếu nhập',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID('4')
    detail_id: string;

    @ApiProperty({
        description: 'Số lượng thực tế đã nhận',
        example: 95,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    actual_qty: number;
}

/**
 * DTO approve inbound request
 */
export class ApproveInboundDto {
    @ApiPropertyOptional({
        description: 'Chi tiết số lượng thực tế (nếu khác expected)',
        type: [ActualQuantityDetailDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActualQuantityDetailDto)
    actual_quantities?: ActualQuantityDetailDto[];

    @ApiPropertyOptional({
        description: 'Ghi chú của warehouse manager',
        example: 'Đã kiểm tra và xác nhận nhập kho',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * DTO reject inbound request
 */
export class RejectInboundDto {
    @ApiProperty({
        description: 'Lý do từ chối',
        example: 'Hàng không đúng chất lượng',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.reject_reason_required') })
    @IsString({ message: i18nValidationMessage('inventory-request.validation.reject_reason_string') })
    @MaxLength(500, { message: i18nValidationMessage('inventory-request.validation.reject_reason_max_length') })
    reason: string;
}

/**
 * DTO approve outbound request
 */
export class ApproveOutboundDto {
    @ApiPropertyOptional({
        description: 'Chiến lược xuất kho (mặc định từ request hoặc FEFO)',
        enum: PickingStrategy,
        example: 'FEFO',
    })
    @IsOptional()
    @IsEnum(PickingStrategy)
    picking_strategy?: PickingStrategy;

    @ApiPropertyOptional({
        description: 'Ghi chú của warehouse manager',
        example: 'Đã chuẩn bị hàng và sẵn sàng xuất',
    })
    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * DTO reject outbound request
 */
export class RejectOutboundDto {
    @ApiProperty({
        description: 'Lý do từ chối',
        example: 'Không đủ tồn kho',
    })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.reject_reason_required') })
    @IsString({ message: i18nValidationMessage('inventory-request.validation.reject_reason_string') })
    @MaxLength(500, { message: i18nValidationMessage('inventory-request.validation.reject_reason_max_length') })
    reason: string;
}

// ── Receiving (Kiểm đếm) ──

export class StartReceivingDto {
    @ApiPropertyOptional({ description: 'ID checker thực hiện' })
    @IsOptional()
    @IsUUID('4')
    checker_id?: string;
}

export class ConfirmReceivingDetailDto {
    @ApiProperty({ description: 'ID chi tiết phiếu nhập' })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
    detail_id: string;

    @ApiProperty({ description: 'Số lượng thực tế đã kiểm đếm', minimum: 0 })
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
    actual_qty: number;
}

export class ConfirmReceivingDto {
    @ApiProperty({ type: [ConfirmReceivingDetailDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ConfirmReceivingDetailDto)
    details: ConfirmReceivingDetailDto[];

    @ApiPropertyOptional({ description: 'Ghi chú kiểm đếm' })
    @IsOptional()
    @IsString()
    notes?: string;
}

// ── Putaway (Cất hàng) ──

export class ConfirmPutawayDetailDto {
    @ApiProperty({ description: 'ID chi tiết phiếu cất hàng' })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
    putaway_detail_id: string;

    @ApiProperty({ description: 'Số lượng thực tế đã cất', minimum: 0 })
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
    actual_qty: number;
}

export class ConfirmPutawayDto {
    @ApiPropertyOptional({ type: [ConfirmPutawayDetailDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ConfirmPutawayDetailDto)
    details?: ConfirmPutawayDetailDto[];

    @ApiPropertyOptional({ description: 'Ghi chú cất hàng' })
    @IsOptional()
    @IsString()
    notes?: string;
}

// ── Picking Confirm (Nhặt hàng) ──

export class ConfirmPickingDetailDto {
    @ApiProperty({ description: 'ID chi tiết pick list' })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
    pick_list_detail_id: string;

    @ApiProperty({ description: 'Số lượng đã nhặt', minimum: 0 })
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
    picked_qty: number;
}

export class ConfirmPickingDto {
    @ApiProperty({ type: [ConfirmPickingDetailDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ConfirmPickingDetailDto)
    details: ConfirmPickingDetailDto[];
}

// ── Checking (Kiểm tra xuất) ──

export class ConfirmCheckingDetailDto {
    @ApiProperty({ description: 'ID chi tiết phiếu xuất' })
    @IsNotEmpty({ message: i18nValidationMessage('inventory-request.validation.detail_id_required') })
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.detail_id_uuid') })
    export_detail_id: string;

    @ApiProperty({ description: 'Số lượng đã kiểm tra', minimum: 0 })
    @IsNumber({}, { message: i18nValidationMessage('inventory-request.validation.quantity_positive') })
    @Min(0, { message: i18nValidationMessage('inventory-request.validation.quantity_min_zero') })
    checked_qty: number;

    @ApiPropertyOptional({ description: 'Đạt hay không?', default: true })
    @IsOptional()
    @IsBoolean()
    passed?: boolean;
}

export class ConfirmCheckingDto {
    @ApiProperty({ type: [ConfirmCheckingDetailDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ConfirmCheckingDetailDto)
    details: ConfirmCheckingDetailDto[];
}

// ── Complete Shipment (Hoàn tất xuất) ──

export class CompleteShipmentDto {
    @ApiPropertyOptional({ description: 'Ghi chú bàn giao' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.notes_string') })
    @MaxLength(1000, { message: i18nValidationMessage('inventory-request.validation.notes_max_length') })
    notes?: string;

    @ApiPropertyOptional({ description: 'Mã vận đơn' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.tracking_number_string') })
    @MaxLength(100, { message: i18nValidationMessage('inventory-request.validation.tracking_number_max_length') })
    tracking_number?: string;
}

// ── Assign Workers ──

export class AssignWorkersDto {
    @ApiPropertyOptional({ description: 'ID checker' })
    @IsOptional()
    @IsUUID('4')
    checker_id?: string;

    @ApiPropertyOptional({ description: 'ID worker cất hàng' })
    @IsOptional()
    @IsUUID('4')
    worker_id?: string;
}
