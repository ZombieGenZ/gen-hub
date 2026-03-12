import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseVisitPurpose } from '@prisma/client';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAiVisitBookingDto {
    @ApiProperty()
    @IsUUID()
    warehouse_id: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    organization_id?: string;

    @ApiProperty()
    @IsString()
    visitor_name: string;

    @ApiProperty()
    @IsEmail()
    visitor_email: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    visitor_phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    visitor_company?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    visitor_position?: string;

    @ApiProperty()
    @IsDateString()
    visit_date: string;

    @ApiProperty()
    @IsString()
    visit_time_start: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    visit_time_end?: string;

    @ApiPropertyOptional({ enum: WarehouseVisitPurpose })
    @IsOptional()
    @IsEnum(WarehouseVisitPurpose)
    purpose?: WarehouseVisitPurpose;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    purpose_details?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    number_of_visitors?: number;
}
