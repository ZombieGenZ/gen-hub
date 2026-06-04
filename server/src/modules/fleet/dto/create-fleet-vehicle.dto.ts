import { ApiProperty } from '@nestjs/swagger';
import { FleetVehicleStatus, FleetVehicleType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFleetVehicleDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  warehouse_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  license_plate: string;

  @ApiProperty({ enum: FleetVehicleType, default: FleetVehicleType.VAN })
  @IsOptional()
  @IsEnum(FleetVehicleType)
  vehicle_type?: FleetVehicleType;

  @ApiProperty({ enum: FleetVehicleStatus, default: FleetVehicleStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(FleetVehicleStatus)
  status?: FleetVehicleStatus;

  @ApiProperty({ description: 'Cargo length in cm' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cargo_length: number;

  @ApiProperty({ description: 'Cargo width in cm' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cargo_width: number;

  @ApiProperty({ description: 'Cargo height in cm' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  cargo_height: number;

  @ApiProperty({ description: 'Max weight capacity in kg' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  max_weight_kg: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
