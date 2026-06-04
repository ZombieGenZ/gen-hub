import { ApiProperty } from '@nestjs/swagger';
import { FleetVehicleStatus, FleetVehicleType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateFleetVehicleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  license_plate?: string;

  @ApiProperty({ enum: FleetVehicleType, required: false })
  @IsOptional()
  @IsEnum(FleetVehicleType)
  vehicle_type?: FleetVehicleType;

  @ApiProperty({ enum: FleetVehicleStatus, required: false })
  @IsOptional()
  @IsEnum(FleetVehicleStatus)
  status?: FleetVehicleStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cargo_length?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cargo_width?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cargo_height?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  max_weight_kg?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
