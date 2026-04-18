import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import { Client, Pool } from 'pg';

// Import seeders
import {
  AdminSeeder,
  SystemPermissionsSeeder,
  ConfigPermissionsSeeder,
  WarehousePermissionsSeeder,
  OrganizationPermissionsSeeder,
  NotificationPermissionsSeeder,
  RentalPermissionsSeeder,
  ProductPermissionsSeeder,
  AddonPermissionsSeeder,
  ContentPermissionsSeeder,
  UserPermissionsSeeder,
  WarehouseManagerPermissionsSeeder,
  PaymentPermissionsSeeder,
  AppDownloadPermissionsSeeder,
  AvatarCoverRankPermissionsSeeder,
  InventoryPermissionsSeeder,
  InventoryWarehouseManagerPermissionsSeeder,
  RevenuePermissionsSeeder,
  AdministrativeSeeder,
  WarningSeeder,
  AmenitySeeder,
  AddonSeeder,
  InsuranceSeeder,
  RentalSeeder,
  ContactSeeder,
  ContactListSeeder,
  CategorySeeder,
  WarehouseManagerRolesSeeder,
  OrganizationSeeder,
  AvatarImageSeeder,
  CoverImageSeeder,
  RankSeeder,
  PhoneCodeSeeder,
  Warehouse3DSeeder,
} from './seeders';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    const isLocal =
      connectionString?.includes('localhost') ||
      connectionString?.includes('127.0.0.1') ||
      connectionString?.includes('host.docker.internal');
    const sslConfig =
      !isLocal && connectionString ? { rejectUnauthorized: false } : undefined;

    const pool = new Pool({
      connectionString,
      ssl: sslConfig,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  /**
   * Get SSL configuration for pg Client/Pool
   */
  private getSslConfig() {
    const connectionString = process.env.DATABASE_URL;
    const isLocal =
      connectionString?.includes('localhost') ||
      connectionString?.includes('127.0.0.1') ||
      connectionString?.includes('host.docker.internal');
    return !isLocal && connectionString
      ? { rejectUnauthorized: false }
      : undefined;
  }

  private isSeedingInProgress = false;
  private seedAdminId: string | null = null;

  async onModuleInit() {
    // Add sslmode=no-verify to DATABASE_URL if it's missing and we're not local
    const connectionString = process.env.DATABASE_URL;
    if (connectionString && !this.getSslConfig()) {
      // Local or no DATABASE_URL
    } else if (
      connectionString &&
      !connectionString.includes('sslmode=no-verify')
    ) {
      const separator = connectionString.includes('?') ? '&' : '?';
      process.env.DATABASE_URL = `${connectionString}${separator}sslmode=no-verify`;
      this.logger.log('🔒 Added sslmode=no-verify to DATABASE_URL');
    }

    await this.initializeDatabase();
    await this.$connect();

    // Chạy seed data trong background để không block server startup
    // Sử dụng setImmediate để đảm bảo server ready trước khi bắt đầu seed
    setImmediate(() => {
      this.runSeedInBackground().catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ Background seeding failed: ${errorMessage}`);
      });
    });
  }

  /**
   * Chạy seed data trong background để không ảnh hưởng đến thời gian khởi động server
   */
  private async runSeedInBackground() {
    if (this.isSeedingInProgress) {
      this.logger.warn('⚠️ Seeding already in progress, skipping...');
      return;
    }

    this.isSeedingInProgress = true;
    this.logger.log('🌱 Starting background seeding...');

    try {
      await this.seedDefaultRoles();
      this.logger.log('✅ Background seeding completed successfully');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Background seeding failed: ${errorMessage}`);
    } finally {
      this.isSeedingInProgress = false;
    }
  }

  /**
   * Parse DATABASE_URL để lấy thông tin kết nối
   */
  private parseDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    try {
      const parsedUrl = new URL(databaseUrl);
      return {
        user: parsedUrl.username,
        password: parsedUrl.password,
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port, 10) || 5432,
        database: parsedUrl.pathname.slice(1), // remove leading /
      };
    } catch (error) {
      throw new Error(
        `Invalid DATABASE_URL format: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Tạo database và extension uuid-ossp nếu chưa tồn tại
   */
  private async ensureDatabaseAndExtension() {
    const config = this.parseDatabaseUrl();
    const sslConfig = this.getSslConfig();

    // Kết nối tới postgres database mặc định để tạo database
    const adminClient = new Client({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      database: 'postgres',
      ssl: sslConfig,
    });

    try {
      await adminClient.connect();

      const dbCheckResult = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [config.database],
      );

      if (dbCheckResult.rows.length === 0) {
        // Skip database creation if on Heroku (it should already exist)
        const connectionString = process.env.DATABASE_URL;
        const isHeroku = connectionString?.includes('heroku');
        if (!isHeroku) {
          await adminClient.query(`CREATE DATABASE "${config.database}"`);
          this.logger.log(`✅ Database "${config.database}" created`);
        } else {
          this.logger.warn(
            `⚠️ Database "${config.database}" not found, but skipping creation on Heroku`,
          );
        }
      }

      await adminClient.end();

      // Kết nối tới database mới tạo để thêm extension
      const dbClient = new Client({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        database: config.database,
        ssl: sslConfig,
      });

      await dbClient.connect();
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      await dbClient.end();

      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to setup database: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Xóa và tạo lại database
   */
  private async recreateDatabase() {
    const config = this.parseDatabaseUrl();
    const sslConfig = this.getSslConfig();

    // Đóng kết nối hiện tại
    await this.$disconnect();

    // Kết nối tới postgres database mặc định
    const adminClient = new Client({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      database: 'postgres',
      ssl: sslConfig,
    });

    try {
      await adminClient.connect();

      // Skip database recreation if on Heroku
      const connectionString = process.env.DATABASE_URL;
      const isHeroku = connectionString?.includes('heroku');

      if (!isHeroku) {
        await adminClient.query(
          `
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = $1
                AND pid <> pg_backend_pid()
            `,
          [config.database],
        );

        await adminClient.query(`CREATE DATABASE "${config.database}"`);
        this.logger.log('✅ Database recreated');
      } else {
        this.logger.warn('⚠️ Skipping database recreation on Heroku');
      }

      await adminClient.end();

      const dbClient = new Client({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        database: config.database,
        ssl: sslConfig,
      });

      await dbClient.connect();
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

      await dbClient.end();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to recreate database: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Khởi tạo database: kiểm tra kết nối và chạy migration nếu cần
   */
  private async initializeDatabase() {
    let needsSchemaSync = false;

    try {
      await this.$connect();

      try {
        await this.$queryRaw`SELECT 1 FROM roles LIMIT 1`;
        const missingTables = await this.getMissingTablesFromPrismaSchema();
        if (missingTables.length > 0) {
          this.logger.warn(
            `Missing ${missingTables.length} table(s) in current database, syncing schema: ${missingTables.join(', ')}`,
          );
          needsSchemaSync = true;
        }

        if (!needsSchemaSync) {
          const missingColumns = await this.getMissingColumnsFromPrismaSchema();
          if (missingColumns.length > 0) {
            this.logger.warn(
              `Missing ${missingColumns.length} column(s) in current database, syncing schema: ${missingColumns.join(', ')}`,
            );
            needsSchemaSync = true;
          }
        }
      } catch {
        this.logger.warn('⚠️ Tables not found, syncing schema...');
        needsSchemaSync = true;
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`⚠️ Connection failed: ${errorMessage}`);
      await this.ensureDatabaseAndExtension();
      needsSchemaSync = true;
    }

    if (needsSchemaSync) {
      try {
        execSync('npx prisma db push', {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
        execSync('npx prisma generate', {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
        this.logger.log('✅ Schema synced');
      } catch {
        this.logger.warn('⚠️ Db push failed, recreating...');
        await this.recreateDatabase();

        try {
          execSync('npx prisma db push', {
            cwd: process.cwd(),
            stdio: 'inherit',
          });
          execSync('npx prisma generate', {
            cwd: process.cwd(),
            stdio: 'inherit',
          });
          this.logger.log('✅ Schema synced');
        } catch (retryError: unknown) {
          const retryErrorMessage =
            retryError instanceof Error
              ? retryError.message
              : String(retryError);
          this.logger.error(`❌ Schema sync failed: ${retryErrorMessage}`);
          throw new Error('Failed to initialize database schema after retry');
        }
      }
    }
  }

  /**
   * Seed các roles mặc định nếu chưa tồn tại
   */
  private async getMissingTablesFromPrismaSchema(): Promise<string[]> {
    const rows = await this.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `;

    const existingTables = new Set(rows.map((row) => row.table_name));

    return Prisma.dmmf.datamodel.models
      .map(
        (model) =>
          (model as { dbName?: string }).dbName ||
          this.toCamelCaseModelName(model.name),
      )
      .filter((tableName) => tableName !== '_prisma_migrations')
      .filter((tableName) => !existingTables.has(tableName));
  }

  private toCamelCaseModelName(modelName: string): string {
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
  }

  private async getMissingColumnsFromPrismaSchema(): Promise<string[]> {
    const rows = await this.$queryRaw<
      Array<{ table_name: string; column_name: string }>
    >`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;

    const existingColumns = new Set(
      rows.map((row) => `${row.table_name}.${row.column_name}`),
    );
    const missing: string[] = [];

    for (const model of Prisma.dmmf.datamodel.models) {
      const tableName =
        (model as { dbName?: string }).dbName ||
        this.toCamelCaseModelName(model.name);
      for (const field of model.fields) {
        if (field.relationName || field.isGenerated) continue;
        const columnName = (field as { dbName?: string }).dbName || field.name;
        const key = `${tableName}.${columnName}`;
        if (!existingColumns.has(key)) {
          missing.push(key);
        }
      }
    }

    return missing;
  }

  private async seedDefaultRoles() {
    try {
      const existingRoles = await this.role.count();

      if (existingRoles === 0) {
        await this.role.createMany({
          data: [
            {
              name: 'User',
              description: 'Người dùng thông thường',
              is_default: true,
              is_active: true,
              is_deleted: false,
            },
            {
              name: 'Admin',
              description: 'Quản trị viên hệ thống',
              is_default: false,
              is_active: true,
              is_deleted: false,
            },
            {
              name: 'Super Admin',
              description: 'Quản trị viên cấp cao với toàn quyền hệ thống',
              is_default: false,
              is_active: true,
              is_deleted: false,
            },
          ],
        });
        this.logger.log('✅ Default roles seeded');
      }

      // Seed admin account first
      const adminSeeder = new AdminSeeder(this);
      await adminSeeder.run();
      this.seedAdminId = adminSeeder.getAdminId();

      // Run permission seeders in batches
      const permissionSeeders = [
        new SystemPermissionsSeeder(this, this.seedAdminId),
        new ConfigPermissionsSeeder(this),
        new WarehousePermissionsSeeder(this),
        new OrganizationPermissionsSeeder(this),
        new NotificationPermissionsSeeder(this),
        new RentalPermissionsSeeder(this),
        new ProductPermissionsSeeder(this),
        new AddonPermissionsSeeder(this),
        new ContentPermissionsSeeder(this),
        new UserPermissionsSeeder(this),
        new WarehouseManagerPermissionsSeeder(this),
        new PaymentPermissionsSeeder(this),
        new AppDownloadPermissionsSeeder(this),
        new AvatarCoverRankPermissionsSeeder(this),
        new InventoryPermissionsSeeder(this),
        new InventoryWarehouseManagerPermissionsSeeder(this),
        new RevenuePermissionsSeeder(this),
      ];

      // Run permission seeders in batches of 3
      const BATCH_SIZE = 3;
      for (let i = 0; i < permissionSeeders.length; i += BATCH_SIZE) {
        const batch = permissionSeeders.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map((seeder) => seeder.run()));
      }

      // Run data seeders (controlled by ENV variables)
      const dataSeeders = [
        new WarningSeeder(this),
        new AmenitySeeder(this),
        new AddonSeeder(this),
        new InsuranceSeeder(this),
        new RentalSeeder(this),
        new ContactSeeder(this),
        new ContactListSeeder(this),
        new CategorySeeder(this),
        new WarehouseManagerRolesSeeder(this),
        new OrganizationSeeder(this),
        new AvatarImageSeeder(this),
        new CoverImageSeeder(this),
        new RankSeeder(this),
        new PhoneCodeSeeder(this),
        new Warehouse3DSeeder(this),
      ];

      // Set admin ID for data seeders
      for (const seeder of dataSeeders) {
        if (
          'setAdminId' in seeder &&
          typeof seeder.setAdminId === 'function' &&
          this.seedAdminId
        ) {
          seeder.setAdminId(this.seedAdminId);
        }
      }

      for (const seeder of dataSeeders) {
        await seeder.run();
      }

      // Seed Vietnam administrative data (may take longer, run separately)
      const administrativeSeeder = new AdministrativeSeeder(this);
      await administrativeSeeder.run();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed default roles: ${errorMessage}`);
    }
  }

  /**
   * Enable shutdown hooks for graceful shutdown
   */
  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
