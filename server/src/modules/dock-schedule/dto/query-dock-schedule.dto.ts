import { ApiProperty } from '@nestjs/swagger';
import { DockScheduleStatus } from '@prisma/client';
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

export class QueryDockScheduleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  warehouse_template_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dock_number?: number;

  @ApiProperty({ enum: DockScheduleStatus, required: false })
  @IsOptional()
  @IsEnum(DockScheduleStatus)
  status?: DockScheduleStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  license_plate?: string;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
