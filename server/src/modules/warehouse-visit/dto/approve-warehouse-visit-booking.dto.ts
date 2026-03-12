import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum WarehouseVisitApprovalAction {
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
}

export class ApproveWarehouseVisitBookingDto {
    @ApiProperty({ enum: WarehouseVisitApprovalAction })
    @IsEnum(WarehouseVisitApprovalAction)
    action: WarehouseVisitApprovalAction;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    confirmation_notes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    rejection_reason?: string;
}
