import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { DatabaseLogService, databaseLogContext } from './database-log.service';
import { SharedModule } from '../../common/shared.module';

/**
 * Middleware để inject context vào mỗi request
 */
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DatabaseLogMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const context = {
      userId: (req as any).user?.id,
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // Run request với context
    databaseLogContext.run(context, () => {
      next();
    });
  }
}

@Global()
@Module({
  imports: [SharedModule],
  providers: [DatabaseLogService],
  exports: [DatabaseLogService],
})
export class DatabaseLogModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DatabaseLogMiddleware).forRoutes('*');
  }
}
