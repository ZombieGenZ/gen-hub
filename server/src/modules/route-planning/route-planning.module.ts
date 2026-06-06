import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoutePlanningController } from './route-planning.controller';
import { RoutePlanningService } from './route-planning.service';
import { RoutePlanningAiService } from './route-planning-ai.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoutePlanningController],
  providers: [RoutePlanningService, RoutePlanningAiService],
  exports: [RoutePlanningService],
})
export class RoutePlanningModule {}
