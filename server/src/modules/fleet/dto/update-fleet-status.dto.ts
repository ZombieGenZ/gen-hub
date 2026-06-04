import { ApiProperty } from '@nestjs/swagger';
import { FleetVehicleStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateFleetStatusDto {
  @ApiProperty({ enum: FleetVehicleStatus })
  @IsNotEmpty()
  @IsEnum(FleetVehicleStatus)
  status: FleetVehicleStatus;
}
