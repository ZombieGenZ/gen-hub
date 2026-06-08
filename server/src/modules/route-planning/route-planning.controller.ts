import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';
import { RoutePlanningService } from './route-planning.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class PlanRouteDto {
  @IsString()
  fleet_vehicle_id!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  export_ids?: string[];

  @IsOptional()
  @IsDateString()
  departure_time?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('warehouse-manager/route-planning')
export class RoutePlanningController {
  constructor(private readonly service: RoutePlanningService) {}

  @Post('plan')
  @HttpCode(HttpStatus.OK)
  plan(@Body() dto: PlanRouteDto) {
    return this.service.plan({
      fleet_vehicle_id: dto.fleet_vehicle_id,
      export_ids: dto.export_ids,
      departure_time: dto.departure_time,
    });
  }
}
