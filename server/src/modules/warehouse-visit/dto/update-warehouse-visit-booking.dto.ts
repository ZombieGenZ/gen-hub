import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseVisitBookingDto } from './create-warehouse-visit-booking.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WarehouseVisitStatus } from '@prisma/client';

export class UpdateWarehouseVisitBookingDto extends PartialType(CreateWarehouseVisitBookingDto) {
    @ApiProperty({ enum: WarehouseVisitStatus, required: false })
    @IsOptional()
    @IsEnum(WarehouseVisitStatus)
    status?: WarehouseVisitStatus;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    cancel_reason?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    confirmation_notes?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    completion_notes?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    visitor_feedback?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    internal_notes?: string;
}
