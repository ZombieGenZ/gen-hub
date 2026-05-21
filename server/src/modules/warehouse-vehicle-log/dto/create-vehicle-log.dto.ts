import { ApiProperty } from '@nestjs/swagger';
import { VehiclePurpose, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVehicleLogDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  warehouse_template_id: string;

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
  @IsDateString()
  entry_time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
