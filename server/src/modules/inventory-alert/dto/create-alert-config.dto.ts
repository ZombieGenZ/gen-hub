import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateAlertConfigDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  warehouse_id: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  product_id: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  min_quantity?: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  reorder_point?: number;

  @ApiProperty({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  lead_time_days?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
