import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsNumber, IsArray, ArrayMinSize, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ── Start Receiving ──

export class StartReceivingDto {
    @ApiPropertyOptional({ description: 'ID checker thực hiện' })
    @IsOptional()
    @IsUUID('4')
    checker_id?: string;
}

// ── Confirm Receiving ──

export class ConfirmReceivingDetailDto {
    @ApiProperty({ description: 'ID chi tiết phiếu nhập' })
    @IsUUID('4')
    detail_id: string;

    @ApiProperty({ description: 'Số lượng thực tế đã kiểm đếm', minimum: 0 })
    @IsNumber()
    @Min(0)
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

// ── Confirm Putaway ──

export class ConfirmPutawayDto {
    @ApiPropertyOptional({ description: 'Ghi chú cất hàng' })
    @IsOptional()
    @IsString()
    notes?: string;
}

// ── Confirm Picking ──

export class ConfirmPickingDetailDto {
    @ApiProperty({ description: 'ID chi tiết pick list' })
    @IsUUID('4')
    pick_list_detail_id: string;

    @ApiProperty({ description: 'Số lượng đã nhặt', minimum: 0 })
    @IsNumber()
    @Min(0)
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

// ── Confirm Checking ──

export class ConfirmCheckingDetailDto {
    @ApiProperty({ description: 'ID chi tiết phiếu xuất' })
    @IsUUID('4')
    export_detail_id: string;

    @ApiProperty({ description: 'Số lượng đã kiểm tra', minimum: 0 })
    @IsNumber()
    @Min(0)
    checked_qty: number;

    @ApiPropertyOptional({ description: 'Đạt hay không?', default: true })
    @IsOptional()
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

// ── Complete Shipment ──

export class CompleteShipmentDto {
    @ApiPropertyOptional({ description: 'Ghi chú bàn giao' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ description: 'Mã vận đơn' })
    @IsOptional()
    @IsString()
    tracking_number?: string;
}
