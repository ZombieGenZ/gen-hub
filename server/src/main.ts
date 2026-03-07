import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { I18nValidationPipe, I18nService } from 'nestjs-i18n';
import { join } from 'path';
import { Response } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter, CustomValidationExceptionFilter } from './common/filters';
import { HttpLoggingInterceptor } from './common/interceptors';
import { SystemLogService } from './modules/system-log/system-log.service';

// Scalar API Reference theme configuration
const scalarTheme = {
  colors: {
    primary: '#0F766E',
    primaryLight: '#14B8A6',
    primaryDark: '#0D5A52',
    gray900: '#1E293B',
    gray700: '#334155',
    gray500: '#64748B',
    gray300: '#CBD5E1',
    gray100: '#F1F5F9',
    background: '#F8FAFC',
    cardSurface: '#FFFFFF',
    sidebarBg: '#F1F5F9',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#0EA5E9',
    border: '#E2E8F0',
  },
};
process.env.TZ = process.env.TZ || 'Asia/Ho_Chi_Minh';

const serverStartTime = new Date();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve static assets from public directory
  app.useStaticAssets(join(__dirname, '..', 'public'));
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

  const orderedTags = [
    'Health',
    'Config',
    'Auth',
    'Account',
    'Two-Factor Authentication',
    'Provinces',
    'Wards',
    'Avatar Images',
    'Cover Images',
    'Ranks',
    'Phone Codes',
    'Public Catalog',
    'Public Organizations',
    'Units',
    'Revenue Analytics',
    'Amenities',
    'Addon Types',
    'Addons',
    'Insurances',
    'Coupons',
    'Public Coupons',
    'Coupon Schedules',
    'Rental Duration Tiers',
    'Warehouse Templates',
    'Warehouse Managers',
    'Warehouse Manager Roles',
    'Warehouse Manager View',
    'Warehouse Manager - Inventory (Collapsed)',
    'Warehouse Visit Booking',
    'Row Templates',
    'Rack Templates',
    'Shelf Templates',
    'Block Templates',
    'Organizations',
    'Organization Update Requests',
    'Organization Roles',
    'Organization Balance',
    'Admin - Organization Balance',
    'Organization Chat',
    'Organization Notifications',
    'Organization API Keys',
    'API Keys',
    'API Key Verification',
    'Public Quotation',
    'Organization Rental Contracts',
    'Rental Contracts',
    'Payment',
    'Payment Admin',
    'Organization Refund Requests',
    'Organization Warehouses',
    'Inventory Request (Organization) (Collapsed)',
    'Partners',
    'Products',
    'Batches',
    'Global Notifications',
    'User Notifications',
    'Contact Tags',
    'Contact List (Blacklist/Whitelist)',
    'Contact & Live Chat',
    'Admin Refund Requests',
    'Warning Category',
    'Warn Penalty',
    'Roles',
    'Permissions',
    'User Management',
    'FAQs',
    'Categories',
    'Articles',
    'Article Emojis & Reactions',
    'Admin - Article Reactions',
    'Article Comments',
    'Admin - Article Comments',
    'System Logs',
    'Coze Plugin',
    'Database',
    'Database Backup',
    'Feature Flags',
    'Resources',
    'Analytics',
    'Webhooks',
  ];

  const configBuilder = new DocumentBuilder()
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
    );

  orderedTags.forEach((tag) => configBuilder.addTag(tag));

  const config = configBuilder.build();

  const document = SwaggerModule.createDocument(app, config);

  // Scalar API Reference for main documentation
  app.use(
    '/api-docs',
    apiReference({
      content: document,
      theme: 'kepler',
      layout: 'modern',
      darkMode: false,
      hideModels: false,
      hideDarkModeToggle: false,
      customCss: `
        :root {
          --scalar-color-1: ${scalarTheme.colors.primary};
          --scalar-color-2: ${scalarTheme.colors.primaryLight};
          --scalar-color-3: ${scalarTheme.colors.primaryDark};
          --scalar-color-accent: ${scalarTheme.colors.primary};
          --scalar-background-1: ${scalarTheme.colors.background};
          --scalar-background-2: ${scalarTheme.colors.cardSurface};
          --scalar-background-3: ${scalarTheme.colors.sidebarBg};
          --scalar-background-accent: ${scalarTheme.colors.gray100};
          --scalar-border-color: ${scalarTheme.colors.border};
          --scalar-color-green: ${scalarTheme.colors.success};
          --scalar-color-red: ${scalarTheme.colors.error};
          --scalar-color-yellow: ${scalarTheme.colors.warning};
          --scalar-color-blue: ${scalarTheme.colors.info};
        }
        .dark-mode {
          --scalar-background-1: ${scalarTheme.colors.gray900};
          --scalar-background-2: ${scalarTheme.colors.gray700};
          --scalar-background-3: ${scalarTheme.colors.gray900};
          --scalar-color-1: ${scalarTheme.colors.primaryLight};
        }
        .sidebar { background: ${scalarTheme.colors.sidebarBg}; }
        .scalar-card { background: ${scalarTheme.colors.cardSurface}; border-color: ${scalarTheme.colors.border}; }
      `,
      favicon: '/genhub.svg',
      metaData: {
        title: 'GEN-HUB API Documentation',
        description: 'API documentation cho hệ thống GEN-HUB',
        ogDescription: 'Modern API documentation for GEN-HUB system',
        ogTitle: 'GEN-HUB API',
      },
    }),
  );

  // JSON endpoint for main API docs
  app.getHttpAdapter().get('/api-docs-json', (req, res: Response) => {
    res.json(document);
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

  // Scalar API Reference for API Key documentation
  app.use(
    '/api-docs-apikey',
    apiReference({
      content: apiKeyDocument,
      theme: 'kepler',
      layout: 'modern',
      darkMode: false,
      hideModels: false,
      hideDarkModeToggle: false,
      customCss: `
        :root {
          --scalar-color-1: ${scalarTheme.colors.primary};
          --scalar-color-2: ${scalarTheme.colors.primaryLight};
          --scalar-color-3: ${scalarTheme.colors.primaryDark};
          --scalar-color-accent: ${scalarTheme.colors.primary};
          --scalar-background-1: ${scalarTheme.colors.background};
          --scalar-background-2: ${scalarTheme.colors.cardSurface};
          --scalar-background-3: ${scalarTheme.colors.sidebarBg};
          --scalar-background-accent: ${scalarTheme.colors.gray100};
          --scalar-border-color: ${scalarTheme.colors.border};
          --scalar-color-green: ${scalarTheme.colors.success};
          --scalar-color-red: ${scalarTheme.colors.error};
          --scalar-color-yellow: ${scalarTheme.colors.warning};
          --scalar-color-blue: ${scalarTheme.colors.info};
        }
        .dark-mode {
          --scalar-background-1: ${scalarTheme.colors.gray900};
          --scalar-background-2: ${scalarTheme.colors.gray700};
          --scalar-background-3: ${scalarTheme.colors.gray900};
          --scalar-color-1: ${scalarTheme.colors.primaryLight};
        }
        .sidebar { background: ${scalarTheme.colors.sidebarBg}; }
        .scalar-card { background: ${scalarTheme.colors.cardSurface}; border-color: ${scalarTheme.colors.border}; }
      `,
      favicon: '/genhub.svg',
      metaData: {
        title: 'GEN-HUB API Key Documentation',
        description: 'API documentation cho các chức năng hổ trợ API Key của GEN-HUB',
        ogDescription: 'API Key documentation for GEN-HUB system',
        ogTitle: 'GEN-HUB API Key',
      },
    }),
  );

  // JSON endpoint for API Key docs
  app.getHttpAdapter().get('/api-docs-apikey-json', (req, res: Response) => {
    res.json(apiKeyDocument);
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
  console.log(`📚 Scalar API Docs: ${backendUrl}/api-docs`);
  console.log(`📄 API JSON: ${backendUrl}/api-docs-json`);
  console.log(`🔑 Scalar API Key Docs: ${backendUrl}/api-docs-apikey`);
  console.log(`📄 API Key JSON: ${backendUrl}/api-docs-apikey-json`);
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

