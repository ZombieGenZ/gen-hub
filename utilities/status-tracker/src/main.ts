import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  // Ưu tiên lấy PORT từ process.env (Render inject) trước khi dùng ConfigService
  const port = process.env.PORT || configService.get<number>('PORT', 10000);

  // Cấu hình CORS
  app.enableCors({
    origin: [
      /localhost(:\d+)?$/,
      /gen-hub\.dev$/,
      /\.gen-hub\.dev$/,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('GenHub Status Tracker API')
    .setDescription('API theo dõi trạng thái các dịch vụ của GenHub')
    .setVersion('1.0')
    .addTag('Tracker')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port, '0.0.0.0');
}
bootstrap();
