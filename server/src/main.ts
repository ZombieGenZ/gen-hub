import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nValidationPipe, I18nService } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, CustomValidationExceptionFilter } from './common/filters';
import { HttpLoggingInterceptor } from './common/interceptors';
import { SystemLogService } from './modules/system-log/system-log.service';
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const serverStartTime = new Date();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const systemLogService = app.get(SystemLogService);
  const i18nService = app.get<I18nService<Record<string, unknown>>>(I18nService);

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(
    new GlobalExceptionFilter(systemLogService),
    new CustomValidationExceptionFilter(i18nService),
  );

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
  systemLogService.logServerStart(port, serverStartTime);

  console.log(`🚀 Server đang chạy tại http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);

  // Graceful Shutdown
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
