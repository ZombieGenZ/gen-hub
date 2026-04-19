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
  const host = process.env.HOST || 'localhost';

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

  // Cấu hình Swagger Metadata
  const config = new DocumentBuilder()
    .setTitle('GEN-HUB Status Tracker Service')
    .setDescription('Dịch vụ giám sát trạng thái hệ thống (Uptime, Latency) cho GEN-HUB. Hệ thống tự động kiểm tra và báo cáo trạng thái các dịch vụ quan trọng.')
    .setVersion('1.0')
    .addTag('System', 'Các API kiểm tra hệ thống')
    .addTag('Tracker', 'Các API lấy dữ liệu giám sát và lịch sử trạng thái')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI tại /api-docs (tương thích Express 5 + NestJS v11)
  // jsonDocumentUrl cho phép truy cập JSON tại /api-docs-json
  SwaggerModule.setup('api-docs', app, document, {
    jsonDocumentUrl: '/api-docs-json',
  });

  // Phải lắng nghe trên 0.0.0.0 cho Render
  await app.listen(port, '0.0.0.0');
  logger.log(`Tài liệu API tại: ${host}/api-docs`);
  logger.log(`Tài liệu API (JSON) tại: ${host}/api-docs-json`);
}
bootstrap();

