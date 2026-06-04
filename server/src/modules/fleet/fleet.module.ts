import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';
import { FleetRepository } from './fleet.repository';

@Module({
  imports: [PrismaModule],
  controllers: [FleetController],
  providers: [FleetService, FleetRepository],
  exports: [FleetService],
})
export class FleetModule {}
