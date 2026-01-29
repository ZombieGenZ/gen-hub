import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleWarehouseVisitBookingDto {
    @ApiProperty({ example: '2024-02-15' })
    @IsNotEmpty()
    @IsDateString()
    visit_date: string;

    @ApiProperty({ example: '14:00' })
    @IsNotEmpty()
    @IsString()
    visit_time_start: string;

    @ApiProperty({ required: false, example: '15:00' })
    @IsOptional()
    @IsString()
    visit_time_end?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    reason?: string;
}
