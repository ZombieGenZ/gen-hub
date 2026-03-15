import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    IsUUID,
    IsNumber,
    IsArray,
    ArrayMinSize,
    ValidateNested,
    Min,
    IsNotEmpty,
    IsBoolean,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

// ── Start Receiving ──

export class StartReceivingDto {
    @ApiPropertyOptional({ description: 'ID checker thực hiện' })
    @IsOptional()
    @IsUUID('4', { message: i18nValidationMessage('inventory-request.validation.checker_id_uuid') })
    checker_id?: string;
}

// ── Confirm Receiving ──

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
    @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
    @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
    @ValidateNested({ each: true })
    @Type(() => ConfirmReceivingDetailDto)
    details: ConfirmReceivingDetailDto[];

    @ApiPropertyOptional({ description: 'Ghi chú kiểm đếm' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.notes_string') })
    notes?: string;
}

// ── Confirm Putaway ──

export class ConfirmPutawayDto {
    @ApiPropertyOptional({ description: 'Ghi chú cất hàng' })
    @IsOptional()
    @IsString({ message: i18nValidationMessage('inventory-request.validation.notes_string') })
    notes?: string;
}

// ── Confirm Picking ──

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
    @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
    @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
    @ValidateNested({ each: true })
    @Type(() => ConfirmPickingDetailDto)
    details: ConfirmPickingDetailDto[];
}

// ── Confirm Checking ──

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
    @IsArray({ message: i18nValidationMessage('inventory-request.validation.details_array') })
    @ArrayMinSize(1, { message: i18nValidationMessage('inventory-request.validation.details_min') })
    @ValidateNested({ each: true })
    @Type(() => ConfirmCheckingDetailDto)
    details: ConfirmCheckingDetailDto[];
}

// ── Complete Shipment ──

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
