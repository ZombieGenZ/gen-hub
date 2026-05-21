import { ApiProperty } from '@nestjs/swagger';
import { VehicleLogStatus, VehiclePurpose } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class QueryVehicleLogDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  warehouse_template_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  license_plate?: string;

  @ApiProperty({ enum: VehicleLogStatus, required: false })
  @IsOptional()
  @IsEnum(VehicleLogStatus)
  status?: VehicleLogStatus;

  @ApiProperty({ enum: VehiclePurpose, required: false })
  @IsOptional()
  @IsEnum(VehiclePurpose)
  purpose?: VehiclePurpose;

  @ApiProperty({ required: false, example: '2024-01-30' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
