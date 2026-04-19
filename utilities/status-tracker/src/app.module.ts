import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrackerModule } from './tracker/tracker.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [
    // Cấu hình ConfigModule để load biến môi trường
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Cấu hình MongooseModule để kết nối MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    // Bật ScheduleModule cho các cron job
    ScheduleModule.forRoot(),
    // Các module nghiệp vụ
    DiscordModule,
    TrackerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
