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

  // Build CORS origins array from CORS_ORIGINS environment variable
  // Example: CORS_ORIGINS=https://gen-hub.dev,http://localhost:3000
  const corsOrigins: string[] = [];

  // Add default CORS origins from environment
  if (process.env.CORS_ORIGINS) {
    const defaultOrigins = process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean);
    corsOrigins.push(...defaultOrigins);
  }

  // Get PrismaService for database queries
  const { PrismaService } = require('./prisma/prisma.service');
  const { getApiKeyModules } = require('./common/config/api-key-modules.config');
  const prismaService = app.get(PrismaService);

  // Add allowed_origins from active API keys to CORS
  let apiKeysWithOrigins: { allowed_origins: string[] }[] = [];
  try {
    apiKeysWithOrigins = await prismaService.apiKey.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        allowed_origins: { isEmpty: false },
      },
      select: { allowed_origins: true },
    });
  } catch (error) {
    console.error('⚠️ Warning: Failed to fetch API keys for CORS configuration. Database might be unreachable.');
    console.error(error.message);
    // Proceed with empty list or exit? 
    // Proceeding might be safer for debugging, but security-wise it means no API keys allow origins. Default is fine.
  }

  const apiKeyOrigins = new Set<string>();
  for (const apiKey of apiKeysWithOrigins) {
    for (const apiKeyOrigin of apiKey.allowed_origins) {
      apiKeyOrigins.add(apiKeyOrigin);
    }
  }

  corsOrigins.push(...apiKeyOrigins);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : '*',
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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    jsonDocumentUrl: '/api-docs-json',
  });

  // API Key Swagger - Dynamically include modules based on DB permissions
  // Query permissions with allow_api_key = true from database
  let permissionKeys: string[] = [];
  try {
    const apiKeyPermissions = await prismaService.organizationPermission.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        allow_api_key: true,
      },
      select: { key: true },
    });
    permissionKeys = apiKeyPermissions.map((p: { key: string }) => p.key);
  } catch (error) {
    console.error('⚠️ Warning: Failed to fetch API Key permissions. Using default modules.');
  }

  // Get enabled modules based on DB permissions
  const { modules: includeModules, enabledModuleNames } = getApiKeyModules(permissionKeys);

  const apiKeyConfig = new DocumentBuilder()
    .setTitle('GEN-HUB API Key Documentation')
    .setDescription('API documentation cho các chức năng hổ trợ API Key của GEN-HUB')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key cho xác thực',
      },
      'api-key',
    )
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
    .build();

  const apiKeyDocument = SwaggerModule.createDocument(app, apiKeyConfig, {
    include: includeModules,
  });

  SwaggerModule.setup('api-docs-apikey', app, apiKeyDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    jsonDocumentUrl: '/api-docs-apikey-json',
  });

  // Count endpoints from Swagger documents
  const countEndpoints = (doc: any): { total: number; byMethod: Record<string, number> } => {
    const byMethod: Record<string, number> = {};
    let total = 0;

    if (doc.paths) {
      for (const path of Object.keys(doc.paths)) {
        const methods = doc.paths[path];
        for (const method of Object.keys(methods)) {
          if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
            byMethod[method.toUpperCase()] = (byMethod[method.toUpperCase()] || 0) + 1;
            total++;
          }
        }
      }
    }

    return { total, byMethod };
  };

  const mainStats = countEndpoints(document);
  const apiKeyStats = countEndpoints(apiKeyDocument);

  const port = process.env.PORT ?? 4000;
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  await app.listen(port);
  systemLogService.logServerStart(port, serverStartTime);

  // In các log sau khi server đã khởi động
  console.log(`🚀 Server đang chạy tại ${backendUrl}`);
  console.log(`📚 Swagger docs: ${backendUrl}/api-docs`);
  console.log(`📄 Swagger JSON: ${backendUrl}/api-docs-json`);
  console.log(`🔑 API Key Swagger: ${backendUrl}/api-docs-apikey`);
  console.log(`📄 API Key Swagger JSON: ${backendUrl}/api-docs-apikey-json`);
  console.log(`🌐 CORS origins: ${corsOrigins.length > 0 ? corsOrigins.join(', ') : '*'}`);
  console.log(`🔑 API Key enabled modules: ${enabledModuleNames.join(', ')}`);
  console.log(`📊 Main API: ${mainStats.total} endpoints (${Object.entries(mainStats.byMethod).map(([m, c]) => `${m}: ${c}`).join(', ')})`);
  console.log(`📊 API Key API: ${apiKeyStats.total} endpoints (${Object.entries(apiKeyStats.byMethod).map(([m, c]) => `${m}: ${c}`).join(', ')})`);

  // Sync Feature Flags (run in background to not block server startup)
  setImmediate(async () => {
    try {
      const { FeatureFlagService } = require('./modules/feature-flag/feature-flag.service');
      const featureFlagService = app.get(FeatureFlagService);

      // Extract routes from Swagger document
      const discoveredRoutes: { module: string; method: any; path: string }[] = [];

      if (document.paths) {
        for (const path of Object.keys(document.paths)) {
          const methods = document.paths[path] as Record<string, any>;
          for (const method of Object.keys(methods)) {
            if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
              const tags = methods[method]?.tags || ['Unknown'];
              discoveredRoutes.push({
                module: tags[0] || 'Unknown',
                method: method.toUpperCase() as any,
                path: path,
              });
            }
          }
        }
      }

      await featureFlagService.syncRoutes(discoveredRoutes);
      console.log(`🚩 Feature flags synced: ${discoveredRoutes.length} routes`);
    } catch (error) {
      console.error('⚠️ Failed to sync feature flags:', error);
    }
  });

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
