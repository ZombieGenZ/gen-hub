import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrackerService } from './tracker.service';
import { TrackerController } from './tracker.controller';
import {
  ServiceStatus,
  ServiceStatusSchema,
} from '../schemas/service-status.schema';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceStatus.name, schema: ServiceStatusSchema },
    ]),
    DiscordModule,
  ],
  providers: [TrackerService],
  controllers: [TrackerController],
})
export class TrackerModule {}
