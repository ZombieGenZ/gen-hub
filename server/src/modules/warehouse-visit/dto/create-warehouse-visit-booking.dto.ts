import { ApiProperty } from '@nestjs/swagger';
import { WarehouseVisitPurpose } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateWarehouseVisitBookingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  warehouse_template_id: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  visitor_name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  visitor_email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visitor_phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visitor_company?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  visitor_position?: string;

  @ApiProperty({ example: '2024-01-30' })
  @IsNotEmpty()
  @IsDateString()
  visit_date: string;

  @ApiProperty({ example: '09:00' })
  @IsNotEmpty()
  @IsString()
  visit_time_start: string;

  @ApiProperty({ required: false, example: '10:00' })
  @IsOptional()
  @IsString()
  visit_time_end?: string;

  @ApiProperty({
    enum: WarehouseVisitPurpose,
    default: WarehouseVisitPurpose.RENTAL_INQUIRY,
  })
  @IsOptional()
  @IsEnum(WarehouseVisitPurpose)
  purpose?: WarehouseVisitPurpose;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  purpose_details?: string;

  @ApiProperty({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  number_of_visitors?: number;
}
