import { ApiProperty } from '@nestjs/swagger';
import { VehiclePurpose, VehicleType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreateDockScheduleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  warehouse_template_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({ description: 'Dock number (1..dock_count)', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  dock_number: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsNotEmpty()
  @IsDateString()
  scheduled_date: string;

  @ApiProperty({ example: '08:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  scheduled_time_start: string;

  @ApiProperty({ example: '09:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  scheduled_time_end: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  license_plate: string;

  @ApiProperty({ enum: VehicleType, default: VehicleType.OTHER })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicle_type?: VehicleType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  driver_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  driver_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  carrier_name?: string;

  @ApiProperty({ enum: VehiclePurpose, default: VehiclePurpose.OTHER })
  @IsOptional()
  @IsEnum(VehiclePurpose)
  purpose?: VehiclePurpose;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  linked_receipt_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  linked_export_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
