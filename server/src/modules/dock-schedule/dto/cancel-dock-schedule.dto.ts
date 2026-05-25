import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelDockScheduleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cancellation_reason?: string;
}
