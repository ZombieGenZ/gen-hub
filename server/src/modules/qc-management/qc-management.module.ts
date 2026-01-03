import { Module, forwardRef } from '@nestjs/common';

import { QCManagementController } from './qc-management.controller';
import { QCManagementService } from './qc-management.service';
import { QCManagementRepository } from './qc-management.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SystemLogModule } from '../system-log/system-log.module';

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        SystemLogModule,
    ],
    controllers: [QCManagementController],
    providers: [QCManagementService, QCManagementRepository],
    exports: [QCManagementService, QCManagementRepository],
})
export class QCManagementModule { }
