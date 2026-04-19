import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

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

  // Expose Swagger JSON
  app.getHttpAdapter().get('/api-docs-json', (req, res) => {
    res.json(document);
  });

  // Tích hợp Scalar thay cho Swagger UI - Sửa lỗi TypeScript
  app.use(
    '/api-docs',
    apiReference({
      spec: {
        content: document,
      },
      // @ts-ignore - Một số thuộc tính theme/layout có thể chưa cập nhật trong d.ts của Scalar NestJS
      theme: 'purple',
      layout: 'modern',
    } as any),
  );

  // Phải lắng nghe trên 0.0.0.0 cho Render
  await app.listen(port, '0.0.0.0');
  logger.log(`Tài liệu API tại: ${host}/api-docs`);
  logger.log(`Tài liệu API (JSON) tại: ${host}/api-docs-json`);
}
bootstrap();
