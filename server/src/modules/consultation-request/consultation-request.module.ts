import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { ConsultationRequestController } from './consultation-request.controller';
import { ConsultationRequestRepository } from './consultation-request.repository';
import { ConsultationRequestService } from './consultation-request.service';

@Module({
    imports: [PrismaModule, RedisModule],
    controllers: [ConsultationRequestController],
    providers: [ConsultationRequestRepository, ConsultationRequestService],
    exports: [ConsultationRequestService],
})
export class ConsultationRequestModule { }
