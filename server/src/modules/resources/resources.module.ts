import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourcesGateway } from './resources.gateway';

/**
 * Resources Module
 * Module quản lý resource monitoring với WebSocket realtime
 */
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_ACCESS_SECRET') || 'default-secret',
      }),
    }),
  ],
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourcesGateway],
  exports: [ResourcesService],
})
export class ResourcesModule {}
