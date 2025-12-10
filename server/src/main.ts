import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nValidationPipe, I18nValidationExceptionFilter } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { HttpLoggingInterceptor } from './common/interceptors';
import { SystemLogService } from './modules/system-log/system-log.service';

// Đặt timezone mặc định cho ứng dụng (GMT+7)
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

// Thời gian server bắt đầu
const serverStartTime = new Date();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lấy SystemLogService từ container
  const systemLogService = app.get(SystemLogService);

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Đăng ký GlobalExceptionFilter (xử lý trước I18nValidationExceptionFilter)
  app.useGlobalFilters(
    new GlobalExceptionFilter(systemLogService),
    new I18nValidationExceptionFilter({
      detailedErrors: false,
    }),
  );

  // Đăng ký HTTP Logging Interceptor
  app.useGlobalInterceptors(new HttpLoggingInterceptor(systemLogService));

  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('GEN-HUB API')
    .setDescription('API documentation cho hệ thống GEN-HUB')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Các API liên quan đến xác thực')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  // Log server startup
  systemLogService.logServerStart(port, serverStartTime);

  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);

  // ============================================================
  // Graceful Shutdown & Crash Handlers
  // ============================================================

  // Xử lý graceful shutdown (SIGTERM, SIGINT)
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n📴 Nhận signal ${signal}, đang tắt server...`);

    try {
      await systemLogService.logServerShutdown(serverStartTime, signal);
      await app.close();
      console.log('✅ Server đã tắt hoàn tất');
      process.exit(0);
    } catch (error) {
      console.error('❌ Lỗi khi tắt server:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => {
    gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    gracefulShutdown('SIGINT');
  });

  // Xử lý uncaught exceptions (crash)
  process.on('uncaughtException', (error: Error) => {
    console.error('💥 Uncaught Exception:', error);

    systemLogService
      .logCritical(error, 'uncaughtException')
      .catch(() => {
        console.error('Failed to log critical error');
      })
      .finally(() => {
        process.exit(1);
      });
  });

  // Xử lý unhandled promise rejections (crash)
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error('💥 Unhandled Rejection:', error);

    systemLogService.logCritical(error, 'unhandledRejection').catch(() => {
      console.error('Failed to log critical error');
    });

    process.exit(1);
  });
}
bootstrap();
