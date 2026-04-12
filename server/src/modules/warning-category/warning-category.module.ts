import { Module, forwardRef } from '@nestjs/common';
import { WarningCategoryController } from './warning-category.controller';
import { WarningCategoryService } from './warning-category.service';
import { WarningCategoryRepository } from './warning-category.repository';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SystemLogModule } from '../system-log/system-log.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    SystemLogModule,
    forwardRef(() => WebsocketModule),
  ],
  controllers: [WarningCategoryController],
  providers: [WarningCategoryService, WarningCategoryRepository],
  exports: [WarningCategoryService, WarningCategoryRepository],
})
export class WarningCategoryModule {}
