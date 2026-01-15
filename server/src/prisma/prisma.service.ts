import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';
import { Client, Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    // Enable SSL for AWS RDS or if explicitly requested
    const isRds = connectionString?.includes('amazonaws.com');
    const sslConfig = isRds ? { rejectUnauthorized: false } : undefined;

    const pool = new Pool({
      connectionString,
      ssl: sslConfig
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  private isSeedingInProgress = false;

  async onModuleInit() {
    await this.initializeDatabase();
    await this.$connect();

    // Chạy seed data trong background để không block server startup
    // Sử dụng setImmediate để đảm bảo server ready trước khi bắt đầu seed
    setImmediate(() => {
      this.runSeedInBackground().catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Background seeding failed: ${errorMessage}`);
    } finally {
      this.isSeedingInProgress = false;
    }
  }

  /**
   * Parse DATABASE_URL để lấy thông tin kết nối
   */
  /*
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
      throw new Error(`Invalid DATABASE_URL format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Tạo database và extension uuid-ossp nếu chưa tồn tại
   */
  private async ensureDatabaseAndExtension() {
    const config = this.parseDatabaseUrl();

    // Kết nối tới postgres database mặc định để tạo database
    const adminClient = new Client({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      database: 'postgres',
    });

    try {
      await adminClient.connect();

      const dbCheckResult = await adminClient.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [config.database],
      );

      if (dbCheckResult.rows.length === 0) {
        await adminClient.query(`CREATE DATABASE "${config.database}"`);
        this.logger.log(`✅ Database "${config.database}" created`);
      }

      await adminClient.end();

      // Kết nối tới database mới tạo để thêm extension
      const dbClient = new Client({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        database: config.database,
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

    // Đóng kết nối hiện tại
    await this.$disconnect();

    // Kết nối tới postgres database mặc định
    const adminClient = new Client({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      database: 'postgres',
    });

    try {
      await adminClient.connect();

      await adminClient.query(
        `
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = $1
                AND pid <> pg_backend_pid()
            `,
        [config.database],
      );
      // await adminClient.query(`DROP DATABASE IF EXISTS "${config.database}"`);

      await adminClient.query(`CREATE DATABASE "${config.database}"`);

      await adminClient.end();

      const dbClient = new Client({
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        database: config.database,
      });

      await dbClient.connect();
      await dbClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      this.logger.log('✅ Database recreated');

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

      // Chạy các hàm seed theo batch để tránh lỗi too many connections
      const seedFunctions = [
        this.seedConfigPermissions.bind(this),
        this.seedDatabaseAdminPermission.bind(this),
        this.seedFeatureFlagPermission.bind(this),
        this.seedResourcesAdminPermission.bind(this),
        this.seedSystemLogsAdminPermission.bind(this),
        this.seedBackupAdminPermission.bind(this),
        this.seedAmenityPermissions.bind(this),
        this.seedAddonPermissions.bind(this),
        this.seedInsurancePermissions.bind(this),
        this.seedCouponPermissions.bind(this),
        this.seedCouponSchedulePermissions.bind(this),
        this.seedWarehouseTemplatePermissions.bind(this),
        this.seedOrganizationPermissions.bind(this),
        this.seedNotificationPermissions.bind(this),
        this.seedRentalContractPermissions.bind(this),
        this.seedWarehousePermissions.bind(this),
        this.seedPartnerPermissions.bind(this),
        this.seedProductPermissions.bind(this),
        this.seedBatchPermissions.bind(this),
        this.seedApiKeyAdminPermissions.bind(this),
        this.seedPaymentPermissions.bind(this),
        this.seedRentalDurationTierPermissions.bind(this),
        this.seedRowTemplatePermissions.bind(this),
        this.seedRackTemplatePermissions.bind(this),
        this.seedShelfTemplatePermissions.bind(this),
        this.seedBlockTemplatePermissions.bind(this),
        this.seedAccountBalancePermissions.bind(this),
        this.seedOrganizationUpdateRequestPermissions.bind(this),
        this.seedAddonTypePermissions.bind(this),
        this.seedFaqPermissions.bind(this),
        this.seedContactPermissions.bind(this),
        this.seedContactTagPermissions.bind(this),
        this.seedQCManagementPermissions.bind(this),
        this.seedQCPermissions.bind(this),
        this.seedRefundRequestPermissions.bind(this),
        this.seedCategoryPermissions.bind(this),
        this.seedArticlePermissions.bind(this),
      ];

      const BATCH_SIZE = 3; // Chạy 3 seed functions cùng lúc
      for (let i = 0; i < seedFunctions.length; i += BATCH_SIZE) {
        const batch = seedFunctions.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(fn => fn()));
      }

      // Seed Vietnam administrative (có thể mất nhiều thời gian nên chạy riêng sau)
      await this.seedVietnamAdministrative();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed default roles: ${errorMessage}`);
    }
  }

  /**
   * Seed permission database.admin cho Database Panel
   */
  private async seedDatabaseAdminPermission() {
    try {
      const existing = await this.permission.findFirst({
        where: { key: 'database.admin' },
      });

      let permissionId = existing?.id;

      if (!existing) {
        const newPermission = await this.permission.create({
          data: {
            key: 'database.admin',
            name: 'Database Admin',
            description: 'Quyền truy cập vào Database Panel',
            is_active: true,
            is_deleted: false,
          },
        });
        permissionId = newPermission.id;
        this.logger.log('✅ Database admin permission seeded');
      }

      // Assign to Super Admin
      if (permissionId) {
        const superAdminRole = await this.role.findFirst({
          where: { name: 'Super Admin', is_deleted: false },
        });

        if (superAdminRole) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: superAdminRole.id,
              permission_id: permissionId,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: superAdminRole.id,
                permission_id: permissionId,
                is_active: true,
                is_deleted: false,
              },
            });
            this.logger.log(
              '✅ Database admin permission assigned to Super Admin',
            );
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed database admin permission: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed permission featureflag.admin cho Feature Flag Management
   */
  private async seedFeatureFlagPermission() {
    try {
      const existing = await this.permission.findFirst({
        where: { key: 'featureflag.admin' },
      });

      let permissionId = existing?.id;

      if (!existing) {
        const newPermission = await this.permission.create({
          data: {
            key: 'featureflag.admin',
            name: 'Feature Flag Admin',
            description: 'Quyền quản lý bật/tắt các API endpoints',
            is_active: true,
            is_deleted: false,
          },
        });
        permissionId = newPermission.id;
        this.logger.log('✅ Feature flag admin permission seeded');
      }

      // Assign to Super Admin
      if (permissionId) {
        const superAdminRole = await this.role.findFirst({
          where: { name: 'Super Admin', is_deleted: false },
        });

        if (superAdminRole) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: superAdminRole.id,
              permission_id: permissionId,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: superAdminRole.id,
                permission_id: permissionId,
                is_active: true,
                is_deleted: false,
              },
            });
            this.logger.log(
              '✅ Feature flag admin permission assigned to Super Admin',
            );
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed feature flag admin permission: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed permission resources.admin cho Resources Panel
   */
  private async seedResourcesAdminPermission() {
    try {
      const existing = await this.permission.findFirst({
        where: { key: 'resources.admin' },
      });

      let permissionId = existing?.id;

      if (!existing) {
        const newPermission = await this.permission.create({
          data: {
            key: 'resources.admin',
            name: 'Resources Admin',
            description: 'Quyền truy cập vào Resources Panel để giám sát tài nguyên hệ thống',
            is_active: true,
            is_deleted: false,
          },
        });
        permissionId = newPermission.id;
        this.logger.log('✅ Resources admin permission seeded');
      }

      // Assign to Super Admin
      if (permissionId) {
        const superAdminRole = await this.role.findFirst({
          where: { name: 'Super Admin', is_deleted: false },
        });

        if (superAdminRole) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: superAdminRole.id,
              permission_id: permissionId,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: superAdminRole.id,
                permission_id: permissionId,
                is_active: true,
                is_deleted: false,
              },
            });
            this.logger.log(
              '✅ Resources admin permission assigned to Super Admin',
            );
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed resources admin permission: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed permission systemlogs.admin cho System Logs Panel
   */
  private async seedSystemLogsAdminPermission() {
    try {
      const existing = await this.permission.findFirst({
        where: { key: 'systemlogs.admin' },
      });

      let permissionId = existing?.id;

      if (!existing) {
        const newPermission = await this.permission.create({
          data: {
            key: 'systemlogs.admin',
            name: 'System Logs Admin',
            description: 'Quyền truy cập vào System Logs để xem log hệ thống',
            is_active: true,
            is_deleted: false,
          },
        });
        permissionId = newPermission.id;
        this.logger.log('✅ System logs admin permission seeded');
      }

      // Assign to Super Admin
      if (permissionId) {
        const superAdminRole = await this.role.findFirst({
          where: { name: 'Super Admin', is_deleted: false },
        });

        if (superAdminRole) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: superAdminRole.id,
              permission_id: permissionId,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: superAdminRole.id,
                permission_id: permissionId,
                is_active: true,
                is_deleted: false,
              },
            });
            this.logger.log(
              '✅ System logs admin permission assigned to Super Admin',
            );
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed system logs admin permission: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed permission backup.admin cho Backup Management
   */
  private async seedBackupAdminPermission() {
    try {
      const existing = await this.permission.findFirst({
        where: { key: 'backup.admin' },
      });

      let permissionId = existing?.id;

      if (!existing) {
        const newPermission = await this.permission.create({
          data: {
            key: 'backup.admin',
            name: 'Backup Admin',
            description: 'Quyền quản lý backup database (list, trigger, download)',
            is_active: true,
            is_deleted: false,
          },
        });
        permissionId = newPermission.id;
        this.logger.log('✅ Backup admin permission seeded');
      }

      // Assign to Super Admin
      if (permissionId) {
        const superAdminRole = await this.role.findFirst({
          where: { name: 'Super Admin', is_deleted: false },
        });

        if (superAdminRole) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: superAdminRole.id,
              permission_id: permissionId,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: superAdminRole.id,
                permission_id: permissionId,
                is_active: true,
                is_deleted: false,
              },
            });
            this.logger.log(
              '✅ Backup admin permission assigned to Super Admin',
            );
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed backup admin permission: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho config và gán vào Super Admin role
   */
  private async seedConfigPermissions() {
    try {
      const configPermissions = [
        {
          key: 'config.update',
          name: 'Cập nhật cấu hình',
          description: 'Quyền cập nhật cấu hình ứng dụng',
        },
        {
          key: 'config.reset',
          name: 'Reset cấu hình',
          description: 'Quyền reset cấu hình về mặc định',
        },
        {
          key: 'config.reload',
          name: 'Reload cấu hình',
          description: 'Quyền reload cấu hình từ file',
        },
      ];

      for (const perm of configPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const superAdminRole = await this.role.findFirst({
        where: { name: 'Super Admin', is_deleted: false },
      });

      if (superAdminRole) {
        const permissions = await this.permission.findMany({
          where: {
            key: { in: configPermissions.map((p) => p.key) },
            is_deleted: false,
          },
        });

        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: superAdminRole.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: superAdminRole.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed config permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho WarehouseTemplate
   * - CRUD permissions: Chỉ Admin và Super Admin
   * - list.all: Cho phép xem tất cả templates kể cả is_active = false
   */
  private async seedWarehouseTemplatePermissions() {
    try {
      const warehouseTemplatePermissions = [
        {
          key: 'warehouse-template.create',
          name: 'Tạo template kho hàng',
          description: 'Quyền tạo mới template kho hàng',
        },
        {
          key: 'warehouse-template.list',
          name: 'Xem danh sách template kho hàng',
          description: 'Quyền xem danh sách template kho hàng (chỉ is_active)',
        },
        {
          key: 'warehouse-template.list.all',
          name: 'Xem tất cả template kho hàng',
          description: 'Quyền xem tất cả template kho hàng bao gồm cả is_active = false',
        },
        {
          key: 'warehouse-template.read',
          name: 'Xem chi tiết template kho hàng',
          description: 'Quyền xem chi tiết template kho hàng',
        },
        {
          key: 'warehouse-template.update',
          name: 'Cập nhật template kho hàng',
          description: 'Quyền cập nhật thông tin template kho hàng',
        },
        {
          key: 'warehouse-template.design',
          name: 'Thiết kế layout template kho hàng',
          description: 'Quyền thiết kế layout (rows, racks, shelves, blocks) template kho hàng',
        },
        {
          key: 'warehouse-template.delete',
          name: 'Xóa template kho hàng',
          description: 'Quyền xóa template kho hàng',
        },
      ];

      for (const perm of warehouseTemplatePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: warehouseTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Warehouse template permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed warehouse-template permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Organization và gán vào các roles tương ứng
   * - organization.create/list/read/update/delete: Tất cả user
   * - organization.list.all/read.all: Chỉ Admin và Super Admin
   */
  private async seedOrganizationPermissions() {
    try {
      // Permissions cơ bản cho tất cả user
      const basicPermissions = [
        {
          key: 'organization.create',
          name: 'Tạo tổ chức',
          description: 'Quyền tạo mới tổ chức',
        },
        {
          key: 'organization.list',
          name: 'Xem danh sách tổ chức',
          description: 'Quyền xem danh sách tổ chức của mình',
        },
        {
          key: 'organization.read',
          name: 'Xem chi tiết tổ chức',
          description: 'Quyền xem chi tiết tổ chức của mình',
        },
        {
          key: 'organization.update',
          name: 'Cập nhật tổ chức',
          description: 'Quyền cập nhật tổ chức của mình',
        },
        {
          key: 'organization.delete',
          name: 'Xóa tổ chức',
          description: 'Quyền xóa tổ chức của mình',
        },
      ];

      // Permissions đặc biệt chỉ cho Admin và Super Admin
      const adminPermissions = [
        {
          key: 'organization.list.all',
          name: 'Xem tất cả tổ chức',
          description: 'Quyền xem danh sách tất cả tổ chức trên hệ thống',
        },
        {
          key: 'organization.read.all',
          name: 'Xem chi tiết tất cả tổ chức',
          description: 'Quyền xem chi tiết bất kỳ tổ chức nào trên hệ thống',
        },
        {
          key: 'organization.update.all',
          name: 'Cập nhật tất cả tổ chức',
          description: 'Quyền cập nhật bất kỳ tổ chức nào trên hệ thống',
        },
        {
          key: 'organization.delete.all',
          name: 'Xóa tất cả tổ chức',
          description: 'Quyền xóa bất kỳ tổ chức nào trên hệ thống',
        },
        {
          key: 'organization.update_request.list',
          name: 'Xem danh sách yêu cầu cập nhật',
          description: 'Quyền xem danh sách yêu cầu cập nhật thông tin tổ chức',
        },
        {
          key: 'organization.update_request.read',
          name: 'Xem chi tiết yêu cầu cập nhật',
          description: 'Quyền xem chi tiết yêu cầu cập nhật thông tin tổ chức',
        },
        {
          key: 'organization.update_request.approve',
          name: 'Duyệt yêu cầu cập nhật',
          description: 'Quyền duyệt yêu cầu cập nhật thông tin tổ chức',
        },
        {
          key: 'organization.update_request.reject',
          name: 'Từ chối yêu cầu cập nhật',
          description: 'Quyền từ chối yêu cầu cập nhật thông tin tổ chức',
        },
      ];

      const allSystemPermissions = [...basicPermissions, ...adminPermissions];

      // Tạo system permissions
      for (const perm of allSystemPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán basic permissions cho tất cả roles
      const allRoles = await this.role.findMany({
        where: { is_deleted: false },
      });

      const basicPermissionRecords = await this.permission.findMany({
        where: {
          key: { in: basicPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of allRoles) {
        for (const permission of basicPermissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // Gán admin permissions chỉ cho Admin và Super Admin
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const adminPermissionRecords = await this.permission.findMany({
        where: {
          key: { in: adminPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of adminPermissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      const orgLevelPermissions = [
        // Member management
        { key: 'organization.member.invite', name: 'Mời thành viên', description: 'Quyền mời thành viên vào tổ chức' },
        { key: 'organization.member.invite.remove', name: 'Hủy lời mời', description: 'Quyền hủy lời mời thành viên' },
        { key: 'organization.member.list', name: 'Xem danh sách thành viên', description: 'Quyền xem danh sách thành viên' },
        { key: 'organization.member.role.assign', name: 'Gán vai trò cho thành viên', description: 'Quyền gán vai trò cho thành viên' },
        { key: 'organization.member.permission.assign', name: 'Gán quyền cho thành viên', description: 'Quyền gán quyền trực tiếp cho thành viên' },
        { key: 'organization.member.remove', name: 'Xóa thành viên', description: 'Quyền xóa thành viên khỏi tổ chức' },
        // Role management
        { key: 'organization.role.list', name: 'Xem danh sách vai trò', description: 'Quyền xem danh sách vai trò' },
        { key: 'organization.role.read', name: 'Xem chi tiết vai trò', description: 'Quyền xem chi tiết vai trò' },
        { key: 'organization.role.create', name: 'Tạo vai trò', description: 'Quyền tạo vai trò trong tổ chức' },
        { key: 'organization.role.update', name: 'Cập nhật vai trò', description: 'Quyền cập nhật vai trò' },
        { key: 'organization.role.delete', name: 'Xóa vai trò', description: 'Quyền xóa vai trò' },
        // API Key management
        { key: 'organization.apikey.create', name: 'Tạo API key', description: 'Quyền tạo API key' },
        { key: 'organization.apikey.read', name: 'Xem danh sách API key', description: 'Quyền xem danh sách API key' },
        { key: 'organization.apikey.update', name: 'Cập nhật API key', description: 'Quyền cập nhật API key' },
        { key: 'organization.apikey.reset', name: 'Reset API key', description: 'Quyền reset API key' },
        { key: 'organization.apikey.delete', name: 'Xóa API key', description: 'Quyền xóa API key' },
        // Organization Notification management
        { key: 'organization.notification.create', name: 'Tạo thông báo tổ chức', description: 'Quyền tạo thông báo cho tổ chức' },
        { key: 'organization.notification.list', name: 'Xem danh sách thông báo', description: 'Quyền xem danh sách thông báo tổ chức' },
        { key: 'organization.notification.read', name: 'Xem chi tiết thông báo', description: 'Quyền xem chi tiết thông báo tổ chức' },
        { key: 'organization.notification.update', name: 'Cập nhật thông báo', description: 'Quyền cập nhật thông báo tổ chức' },
        { key: 'organization.notification.delete', name: 'Xóa thông báo', description: 'Quyền xóa thông báo tổ chức' },
        // Chat management (Agora RTM + RTC)
        { key: 'chat.view', name: 'Xem tin nhắn chat', description: 'Quyền xem tin nhắn trong chat tổ chức', allow_api_key: true },
        { key: 'chat.send', name: 'Gửi tin nhắn chat', description: 'Quyền gửi tin nhắn trong chat tổ chức', allow_api_key: true },
        { key: 'chat.delete', name: 'Xóa tin nhắn chat', description: 'Quyền xóa tin nhắn trong chat tổ chức', allow_api_key: true },
        { key: 'chat.call.view', name: 'Xem cuộc gọi', description: 'Quyền xem thông tin cuộc gọi', allow_api_key: true },
        { key: 'chat.call.start', name: 'Bắt đầu cuộc gọi', description: 'Quyền bắt đầu cuộc gọi voice/video', allow_api_key: false },
        { key: 'chat.call.join', name: 'Tham gia cuộc gọi', description: 'Quyền tham gia cuộc gọi đang diễn ra', allow_api_key: false },
      ];

      for (const perm of orgLevelPermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              allow_api_key: (perm as { allow_api_key?: boolean }).allow_api_key ?? true,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Organization permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed organization permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Notification modules (GlobalNotification, UserNotification)
   */
  private async seedNotificationPermissions() {
    try {
      // Global Notification permissions - Admin only
      const globalNotificationPermissions = [
        {
          key: 'global-notification.create',
          name: 'Tạo thông báo toàn cầu',
          description: 'Quyền tạo thông báo toàn cầu',
        },
        {
          key: 'global-notification.list',
          name: 'Xem danh sách thông báo toàn cầu',
          description: 'Quyền xem danh sách thông báo toàn cầu',
        },
        {
          key: 'global-notification.read',
          name: 'Xem chi tiết thông báo toàn cầu',
          description: 'Quyền xem chi tiết thông báo toàn cầu',
        },
        {
          key: 'global-notification.update',
          name: 'Cập nhật thông báo toàn cầu',
          description: 'Quyền cập nhật thông báo toàn cầu',
        },
        {
          key: 'global-notification.delete',
          name: 'Xóa thông báo toàn cầu',
          description: 'Quyền xóa thông báo toàn cầu',
        },
      ];

      // User Notification admin permissions
      const userNotificationAdminPermissions = [
        {
          key: 'user-notification.list.all',
          name: 'Xem thông báo của tất cả user',
          description: 'Quyền xem danh sách thông báo của bất kỳ user nào',
        },
        {
          key: 'user-notification.send',
          name: 'Gửi thông báo cho user',
          description: 'Quyền gửi thông báo cho user bất kỳ',
        },
      ];

      const allNotificationPermissions = [
        ...globalNotificationPermissions,
        ...userNotificationAdminPermissions,
      ];

      // Tạo permissions
      for (const perm of allNotificationPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán cho Admin và Super Admin roles
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: allNotificationPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Notification permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed notification permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Rental Contract
   * - rental-contract.create/list/read: Tất cả user
   * - rental-contract.update/delete: Chỉ Admin và Super Admin
   * - rental-contract.list.all: Chỉ Admin và Super Admin
   */
  private async seedRentalContractPermissions() {
    try {
      // Permissions cơ bản cho tất cả user
      const basicPermissions = [
        {
          key: 'rental-contract.create',
          name: 'Tạo hợp đồng thuê',
          description: 'Quyền tạo hợp đồng thuê kho mới',
        },
        {
          key: 'rental-contract.list',
          name: 'Xem danh sách hợp đồng',
          description: 'Quyền xem danh sách hợp đồng thuê của mình',
        },
        {
          key: 'rental-contract.read',
          name: 'Xem chi tiết hợp đồng',
          description: 'Quyền xem chi tiết hợp đồng thuê của mình',
        },
      ];

      // Permissions đặc biệt chỉ cho Admin và Super Admin
      const adminPermissions = [
        {
          key: 'rental-contract.update',
          name: 'Cập nhật hợp đồng',
          description: 'Quyền cập nhật/gia hạn hợp đồng thuê',
        },
        {
          key: 'rental-contract.delete',
          name: 'Hủy hợp đồng',
          description: 'Quyền hủy hợp đồng thuê',
        },
        {
          key: 'rental-contract.list.all',
          name: 'Xem tất cả hợp đồng',
          description: 'Quyền xem danh sách tất cả hợp đồng thuê trên hệ thống',
        },
      ];

      const allSystemPermissions = [...basicPermissions, ...adminPermissions];

      // Tạo system permissions
      for (const perm of allSystemPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán basic permissions cho tất cả roles
      const allRoles = await this.role.findMany({
        where: { is_deleted: false },
      });

      const basicPermissionRecords = await this.permission.findMany({
        where: {
          key: { in: basicPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of allRoles) {
        for (const permission of basicPermissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // Gán admin permissions chỉ cho Admin và Super Admin
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const adminPermissionRecords = await this.permission.findMany({
        where: {
          key: { in: adminPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of adminPermissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // Tạo org-level permissions cho rental contract
      const orgLevelRentalPermissions = [
        { key: 'rental-contract.list', name: 'Xem danh sách hợp đồng', description: 'Quyền xem danh sách hợp đồng trong tổ chức' },
        { key: 'rental-contract.read', name: 'Xem chi tiết hợp đồng', description: 'Quyền xem chi tiết hợp đồng trong tổ chức' },
        { key: 'rental-contract.create', name: 'Tạo hợp đồng thuê', description: 'Quyền tạo hợp đồng thuê trong tổ chức' },
        { key: 'rental-contract.update', name: 'Cập nhật hợp đồng', description: 'Quyền cập nhật hợp đồng trong tổ chức' },
        { key: 'rental-contract.delete', name: 'Hủy hợp đồng', description: 'Quyền hủy hợp đồng trong tổ chức' },
      ];

      for (const perm of orgLevelRentalPermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Rental contract permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed rental contract permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Warehouse module
   * Warehouse là resource cấp tổ chức, tất cả user đã đăng nhập đều có thể sử dụng
   */
  private async seedWarehousePermissions() {
    try {
      // System-level permissions cho tất cả roles
      const warehousePermissions = [
        {
          key: 'warehouse.list',
          name: 'Xem danh sách kho',
          description: 'Quyền xem danh sách kho hàng',
        },
        {
          key: 'warehouse.read',
          name: 'Xem chi tiết kho',
          description: 'Quyền xem chi tiết kho hàng',
        },
        {
          key: 'warehouse.update',
          name: 'Cập nhật kho',
          description: 'Quyền cập nhật thông tin kho hàng',
        },
        {
          key: 'warehouse.delete',
          name: 'Xóa kho',
          description: 'Quyền xóa kho hàng',
        },
        {
          key: 'warehouse.layout.view',
          name: 'Xem layout kho',
          description: 'Quyền xem sơ đồ bố trí kho hàng',
        },
      ];

      // Tạo system permissions
      for (const perm of warehousePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán cho tất cả roles
      const allRoles = await this.role.findMany({
        where: { is_deleted: false },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: warehousePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of allRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // Tạo org-level permissions cho warehouse
      const orgLevelWarehousePermissions = [
        { key: 'warehouse.list', name: 'Xem danh sách kho', description: 'Quyền xem danh sách kho trong tổ chức' },
        { key: 'warehouse.read', name: 'Xem chi tiết kho', description: 'Quyền xem chi tiết kho trong tổ chức' },
        { key: 'warehouse.update', name: 'Cập nhật kho', description: 'Quyền cập nhật kho trong tổ chức' },
        { key: 'warehouse.delete', name: 'Xóa kho', description: 'Quyền xóa kho trong tổ chức' },
        { key: 'warehouse.layout.view', name: 'Xem layout kho', description: 'Quyền xem sơ đồ bố trí kho trong tổ chức' },
      ];

      for (const perm of orgLevelWarehousePermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Warehouse permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed warehouse permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Amenity module
   * Amenity là resource cấp hệ thống, users có thể xem danh sách tiện ích công khai
   */
  private async seedAmenityPermissions() {
    try {
      // Admin-only permissions cho Amenity
      const adminPermissions = [
        {
          key: 'amenity.create',
          name: 'Tạo tiện ích',
          description: 'Quyền tạo tiện ích mới',
        },
        {
          key: 'amenity.update',
          name: 'Cập nhật tiện ích',
          description: 'Quyền cập nhật tiện ích',
        },
        {
          key: 'amenity.delete',
          name: 'Xóa tiện ích',
          description: 'Quyền xóa tiện ích',
        },
        {
          key: 'amenity.list',
          name: 'Xem tất cả tiện ích',
          description: 'Quyền xem tất cả tiện ích',
        },
        {
          key: 'amenity.read',
          name: 'Xem chi tiết tiện ích',
          description: 'Quyền xem chi tiết tiện ích',
        },
      ];

      // Tạo permissions
      for (const perm of adminPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: adminPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Amenity permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed amenity permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho RentalDurationTier module
   * - Chỉ Admin và Super Admin có quyền CRUD
   */
  private async seedRentalDurationTierPermissions() {
    try {
      const rentalDurationTierPermissions = [
        {
          key: 'rental-duration-tier.create',
          name: 'Tạo mốc thời gian thuê',
          description: 'Quyền tạo mốc thời gian thuê mới',
        },
        {
          key: 'rental-duration-tier.list',
          name: 'Xem danh sách mốc thời gian thuê',
          description: 'Quyền xem danh sách mốc thời gian thuê',
        },
        {
          key: 'rental-duration-tier.read',
          name: 'Xem chi tiết mốc thời gian thuê',
          description: 'Quyền xem chi tiết mốc thời gian thuê',
        },
        {
          key: 'rental-duration-tier.update',
          name: 'Cập nhật mốc thời gian thuê',
          description: 'Quyền cập nhật mốc thời gian thuê',
        },
        {
          key: 'rental-duration-tier.delete',
          name: 'Xóa mốc thời gian thuê',
          description: 'Quyền xóa mốc thời gian thuê',
        },
      ];

      for (const perm of rentalDurationTierPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: rentalDurationTierPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ RentalDurationTier permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed rental-duration-tier permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho RowTemplate
   */
  private async seedRowTemplatePermissions() {
    try {
      const rowTemplatePermissions = [
        {
          key: 'row-template.create',
          name: 'Tạo dãy template',
          description: 'Quyền tạo dãy mới cho warehouse template',
        },
        {
          key: 'row-template.list',
          name: 'Xem danh sách dãy template',
          description: 'Quyền xem danh sách dãy của warehouse template',
        },
        {
          key: 'row-template.read',
          name: 'Xem chi tiết dãy template',
          description: 'Quyền xem chi tiết dãy',
        },
        {
          key: 'row-template.update',
          name: 'Cập nhật dãy template',
          description: 'Quyền cập nhật dãy',
        },
        {
          key: 'row-template.delete',
          name: 'Xóa dãy template',
          description: 'Quyền xóa dãy',
        },
      ];

      for (const perm of rowTemplatePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: rowTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ RowTemplate permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed row-template permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho RackTemplate
   */
  private async seedRackTemplatePermissions() {
    try {
      const rackTemplatePermissions = [
        {
          key: 'rack-template.create',
          name: 'Tạo kệ template',
          description: 'Quyền tạo kệ mới cho dãy',
        },
        {
          key: 'rack-template.list',
          name: 'Xem danh sách kệ template',
          description: 'Quyền xem danh sách kệ của dãy',
        },
        {
          key: 'rack-template.read',
          name: 'Xem chi tiết kệ template',
          description: 'Quyền xem chi tiết kệ',
        },
        {
          key: 'rack-template.update',
          name: 'Cập nhật kệ template',
          description: 'Quyền cập nhật kệ',
        },
        {
          key: 'rack-template.delete',
          name: 'Xóa kệ template',
          description: 'Quyền xóa kệ',
        },
      ];

      for (const perm of rackTemplatePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: rackTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ RackTemplate permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed rack-template permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho ShelfTemplate
   */
  private async seedShelfTemplatePermissions() {
    try {
      const shelfTemplatePermissions = [
        {
          key: 'shelf-template.create',
          name: 'Tạo tầng template',
          description: 'Quyền tạo tầng mới cho kệ',
        },
        {
          key: 'shelf-template.list',
          name: 'Xem danh sách tầng template',
          description: 'Quyền xem danh sách tầng của kệ',
        },
        {
          key: 'shelf-template.read',
          name: 'Xem chi tiết tầng template',
          description: 'Quyền xem chi tiết tầng',
        },
        {
          key: 'shelf-template.update',
          name: 'Cập nhật tầng template',
          description: 'Quyền cập nhật tầng',
        },
        {
          key: 'shelf-template.delete',
          name: 'Xóa tầng template',
          description: 'Quyền xóa tầng',
        },
      ];

      for (const perm of shelfTemplatePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: shelfTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ ShelfTemplate permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed shelf-template permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho BlockTemplate
   */
  private async seedBlockTemplatePermissions() {
    try {
      const blockTemplatePermissions = [
        {
          key: 'block-template.create',
          name: 'Tạo ô template',
          description: 'Quyền tạo ô mới cho tầng',
        },
        {
          key: 'block-template.list',
          name: 'Xem danh sách ô template',
          description: 'Quyền xem danh sách ô của tầng',
        },
        {
          key: 'block-template.read',
          name: 'Xem chi tiết ô template',
          description: 'Quyền xem chi tiết ô',
        },
        {
          key: 'block-template.update',
          name: 'Cập nhật ô template',
          description: 'Quyền cập nhật ô',
        },
        {
          key: 'block-template.delete',
          name: 'Xóa ô template',
          description: 'Quyền xóa ô',
        },
      ];

      for (const perm of blockTemplatePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: blockTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ BlockTemplate permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed block-template permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed dữ liệu đơn vị hành chính Việt Nam sau sáp nhập 07/2025
   * Nguồn: VietMap - github.com/vietmap-company/vietnam_administrative_address
   * Cấu trúc: 2 cấp (Province > Ward) - 34 tỉnh/thành, ~3321 phường/xã
   */
  private async seedVietnamAdministrative() {
    try {
      const existingProvinces = await this.province.count();
      if (existingProvinces > 0) {
        return;
      }

      this.logger.log('🌱 Seeding Vietnam administrative...');

      const provincesUrl = 'https://raw.githubusercontent.com/vietmap-company/vietnam_administrative_address/main/admin_new/province.json';
      const wardsUrl = 'https://raw.githubusercontent.com/vietmap-company/vietnam_administrative_address/main/admin_new/ward.json';

      const [provincesResponse, wardsResponse] = await Promise.all([
        fetch(provincesUrl),
        fetch(wardsUrl),
      ]);

      if (!provincesResponse.ok) {
        throw new Error(`Provinces API failed: ${provincesResponse.status}`);
      }
      if (!wardsResponse.ok) {
        throw new Error(`Wards API failed: ${wardsResponse.status}`);
      }

      const provincesData = await provincesResponse.json() as Record<string, VietMapProvince>;
      const wardsData = await wardsResponse.json() as Record<string, VietMapWard>;

      const provinces = Object.values(provincesData);
      const wards = Object.values(wardsData);

      const wardsByProvince = new Map<string, VietMapWard[]>();
      for (const ward of wards) {
        const provinceCode = ward.parent_code;
        if (!wardsByProvince.has(provinceCode)) {
          wardsByProvince.set(provinceCode, []);
        }
        wardsByProvince.get(provinceCode)!.push(ward);
      }

      for (const province of provinces) {
        const provinceWards = wardsByProvince.get(province.code) || [];

        await this.province.create({
          data: {
            code: province.code,
            name: province.name,
            slug: province.slug,
            type: this.mapProvinceType(province.type),
            wards: {
              create: provinceWards.map((ward) => ({
                code: ward.code,
                name: ward.name,
                slug: ward.slug,
                type: this.mapWardType(ward.type),
              })),
            },
          },
        });
      }

      this.logger.log(`✅ Seeded ${provinces.length} provinces, ${wards.length} wards`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed Vietnam administrative: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho Partner module (Organization-level)
   */
  private async seedPartnerPermissions() {
    try {
      const partnerPermissions = [
        { key: 'partner.create', name: 'Tạo đối tác', description: 'Quyền tạo đối tác mới' },
        { key: 'partner.list', name: 'Xem danh sách đối tác', description: 'Quyền xem danh sách đối tác' },
        { key: 'partner.read', name: 'Xem chi tiết đối tác', description: 'Quyền xem chi tiết đối tác' },
        { key: 'partner.update', name: 'Cập nhật đối tác', description: 'Quyền cập nhật đối tác' },
        { key: 'partner.delete', name: 'Xóa đối tác', description: 'Quyền xóa đối tác' },
      ];

      for (const perm of partnerPermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key, is_deleted: false },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              allow_api_key: true,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Partner permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed partner permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho Product module (Organization-level)
   */
  private async seedProductPermissions() {
    try {
      const productPermissions = [
        { key: 'product.create', name: 'Tạo sản phẩm', description: 'Quyền tạo sản phẩm mới' },
        { key: 'product.list', name: 'Xem danh sách sản phẩm', description: 'Quyền xem danh sách sản phẩm' },
        { key: 'product.read', name: 'Xem chi tiết sản phẩm', description: 'Quyền xem chi tiết sản phẩm' },
        { key: 'product.update', name: 'Cập nhật sản phẩm', description: 'Quyền cập nhật sản phẩm' },
        { key: 'product.delete', name: 'Xóa sản phẩm', description: 'Quyền xóa sản phẩm' },
      ];

      for (const perm of productPermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key, is_deleted: false },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              allow_api_key: true,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Product permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed product permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho Batch module (Organization-level)
   */
  private async seedBatchPermissions() {
    try {
      const batchPermissions = [
        { key: 'batch.create', name: 'Tạo lô hàng', description: 'Quyền tạo lô hàng mới' },
        { key: 'batch.list', name: 'Xem danh sách lô hàng', description: 'Quyền xem danh sách lô hàng' },
        { key: 'batch.read', name: 'Xem chi tiết lô hàng', description: 'Quyền xem chi tiết lô hàng' },
        { key: 'batch.update', name: 'Cập nhật lô hàng', description: 'Quyền cập nhật lô hàng' },
        { key: 'batch.delete', name: 'Xóa lô hàng', description: 'Quyền xóa lô hàng' },
      ];

      for (const perm of batchPermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key, is_deleted: false },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              allow_api_key: true,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Batch permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed batch permissions: ${errorMessage}`);
    }
  }


  /**
   * Seed các permissions cho Organization Update Request (Organization-level)
   */
  private async seedOrganizationUpdateRequestPermissions() {
    try {
      const permissions = [
        {
          key: 'organization.update_request',
          name: 'Yêu cầu cập nhật thông tin tổ chức',
          description: 'Quyền yêu cầu cập nhật các thông tin quan trọng của tổ chức',
        },
      ];

      for (const perm of permissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key, is_deleted: false },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              allow_api_key: true,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Organization update request permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed organization update request permissions: ${errorMessage}`,
      );
    }
  }

  private mapProvinceType(type: string): 'CITY' | 'PROVINCE' {
    const typeMap: Record<string, 'CITY' | 'PROVINCE'> = {
      'thanh-pho': 'CITY',
      'tinh': 'PROVINCE',
    };
    return typeMap[type?.toLowerCase()] || 'PROVINCE';
  }

  private mapWardType(type: string): 'WARD' | 'COMMUNE' | 'TOWNSHIP' | 'TOWN' | 'CITY' {
    const typeMap: Record<string, 'WARD' | 'COMMUNE' | 'TOWNSHIP' | 'TOWN' | 'CITY'> = {
      'phuong': 'WARD',
      'xa': 'COMMUNE',
      'thi-tran': 'TOWNSHIP',
      'thi-xa': 'TOWN',
      'thanh-pho': 'CITY',
    };
    return typeMap[type?.toLowerCase()] || 'COMMUNE';
  }

  enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', () => {
      app.close();
    });
  }

  /**
   * Seed các permissions cho Admin API Key Management
   */
  private async seedApiKeyAdminPermissions() {
    try {
      const apiKeyAdminPermissions = [
        {
          key: 'apikey.admin.list',
          name: 'Xem danh sách tất cả API keys',
          description: 'Quyền xem danh sách API keys của tất cả tổ chức',
        },
        {
          key: 'apikey.admin.read',
          name: 'Xem chi tiết API key',
          description: 'Quyền xem chi tiết API key của bất kỳ tổ chức nào',
        },
        {
          key: 'apikey.admin.update',
          name: 'Cập nhật API key',
          description: 'Quyền cập nhật API key của bất kỳ tổ chức nào',
        },
        {
          key: 'apikey.admin.delete',
          name: 'Xóa API key',
          description: 'Quyền xóa API key của bất kỳ tổ chức nào',
        },
      ];

      // Tạo permissions
      for (const perm of apiKeyAdminPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán cho Admin và Super Admin roles
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: apiKeyAdminPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ API Key Admin permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed API Key Admin permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Payment (Admin only)
   */
  private async seedPaymentPermissions() {
    try {
      const paymentPermissions = [
        {
          key: 'payment.list.all',
          name: 'Xem tất cả thanh toán',
          description: 'Quyền xem danh sách tất cả thanh toán trên hệ thống',
        },
        {
          key: 'payment.read.all',
          name: 'Xem chi tiết thanh toán',
          description: 'Quyền xem chi tiết bất kỳ thanh toán nào trên hệ thống',
        },
      ];

      for (const perm of paymentPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán cho Admin và Super Admin roles
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: paymentPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Payment permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed payment permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Addon
   */
  private async seedAddonPermissions() {
    try {
      const addonPermissions = [
        {
          key: 'addon.create',
          name: 'Tạo addon',
          description: 'Quyền tạo mới addon',
        },
        {
          key: 'addon.list',
          name: 'Xem danh sách addon',
          description: 'Quyền xem danh sách addon',
        },
        {
          key: 'addon.read',
          name: 'Xem chi tiết addon',
          description: 'Quyền xem chi tiết addon',
        },
        {
          key: 'addon.update',
          name: 'Cập nhật addon',
          description: 'Quyền cập nhật addon',
        },
        {
          key: 'addon.delete',
          name: 'Xóa addon',
          description: 'Quyền xóa addon',
        },
      ];

      for (const perm of addonPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin roles
      const roles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: addonPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of roles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Addon permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed addon permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Coupon
   */
  private async seedCouponPermissions() {
    try {
      const couponPermissions = [
        {
          key: 'coupon.create',
          name: 'Tạo coupon',
          description: 'Quyền tạo mới coupon',
        },
        {
          key: 'coupon.list',
          name: 'Xem danh sách coupon',
          description: 'Quyền xem danh sách coupon',
        },
        {
          key: 'coupon.read',
          name: 'Xem chi tiết coupon',
          description: 'Quyền xem chi tiết coupon',
        },
        {
          key: 'coupon.update',
          name: 'Cập nhật coupon',
          description: 'Quyền cập nhật coupon',
        },
        {
          key: 'coupon.delete',
          name: 'Xóa coupon',
          description: 'Quyền xóa coupon',
        },
      ];

      for (const perm of couponPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin roles
      const roles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: couponPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of roles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Coupon permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed coupon permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho CouponSchedule
   */
  private async seedCouponSchedulePermissions() {
    try {
      const couponSchedulePermissions = [
        {
          key: 'coupon-schedule.create',
          name: 'Tạo lịch coupon',
          description: 'Quyền tạo lịch tự động tạo coupon',
        },
        {
          key: 'coupon-schedule.list',
          name: 'Xem danh sách lịch coupon',
          description: 'Quyền xem danh sách lịch coupon',
        },
        {
          key: 'coupon-schedule.read',
          name: 'Xem chi tiết lịch coupon',
          description: 'Quyền xem chi tiết lịch coupon',
        },
        {
          key: 'coupon-schedule.update',
          name: 'Cập nhật lịch coupon',
          description: 'Quyền cập nhật lịch coupon',
        },
        {
          key: 'coupon-schedule.delete',
          name: 'Xóa lịch coupon',
          description: 'Quyền xóa lịch coupon',
        },
      ];

      for (const perm of couponSchedulePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin roles
      const roles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: couponSchedulePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of roles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ CouponSchedule permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed coupon-schedule permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Account Balance (Admin only)
   */
  private async seedAccountBalancePermissions() {
    try {
      const accountBalancePermissions = [
        {
          key: 'account-balance.list.all',
          name: 'Xem tất cả số dư',
          description: 'Quyền xem số dư của tất cả users',
        },
        {
          key: 'account-balance.adjust',
          name: 'Điều chỉnh số dư',
          description: 'Quyền điều chỉnh số dư (thưởng/phạt)',
        },
        {
          key: 'balance-transaction.list.all',
          name: 'Xem tất cả giao dịch',
          description: 'Quyền xem lịch sử giao dịch của tất cả users',
        },
      ];

      for (const perm of accountBalancePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Assign to Admin and Super Admin
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: accountBalancePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Account balance permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed account-balance permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Insurance (Bảo hiểm)
   * - CRUD permissions: Chỉ Admin và Super Admin
   */
  private async seedInsurancePermissions() {
    try {
      const insurancePermissions = [
        {
          key: 'insurance.create',
          name: 'Tạo bảo hiểm',
          description: 'Quyền tạo mới bảo hiểm',
        },
        {
          key: 'insurance.list',
          name: 'Xem danh sách bảo hiểm',
          description: 'Quyền xem danh sách bảo hiểm',
        },
        {
          key: 'insurance.read',
          name: 'Xem chi tiết bảo hiểm',
          description: 'Quyền xem chi tiết bảo hiểm',
        },
        {
          key: 'insurance.update',
          name: 'Cập nhật bảo hiểm',
          description: 'Quyền cập nhật thông tin bảo hiểm',
        },
        {
          key: 'insurance.delete',
          name: 'Xóa bảo hiểm',
          description: 'Quyền xóa bảo hiểm',
        },
      ];

      for (const perm of insurancePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: insurancePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Insurance permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed insurance permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho AddonType (Loại addon)
   */
  private async seedAddonTypePermissions() {
    try {
      const addonTypePermissions = [
        { key: 'addon-type.create', name: 'Tạo loại addon', description: 'Quyền tạo loại addon mới' },
        { key: 'addon-type.list', name: 'Xem danh sách loại addon', description: 'Quyền xem danh sách loại addon' },
        { key: 'addon-type.read', name: 'Xem chi tiết loại addon', description: 'Quyền xem chi tiết loại addon' },
        { key: 'addon-type.update', name: 'Cập nhật loại addon', description: 'Quyền cập nhật loại addon' },
        { key: 'addon-type.delete', name: 'Xóa loại addon', description: 'Quyền xóa loại addon' },
      ];

      for (const perm of addonTypePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: addonTypePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ AddonType permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed addon-type permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho FAQ
   */
  private async seedFaqPermissions() {
    try {
      const faqPermissions = [
        { key: 'faq.create', name: 'Tạo FAQ', description: 'Quyền tạo câu hỏi thường gặp mới' },
        { key: 'faq.list', name: 'Xem danh sách FAQ', description: 'Quyền xem danh sách FAQ' },
        { key: 'faq.read', name: 'Xem chi tiết FAQ', description: 'Quyền xem chi tiết FAQ' },
        { key: 'faq.update', name: 'Cập nhật FAQ', description: 'Quyền cập nhật FAQ' },
        { key: 'faq.delete', name: 'Xóa FAQ', description: 'Quyền xóa FAQ' },
      ];

      for (const perm of faqPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: faqPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ FAQ permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed faq permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho Contact Support
   */
  private async seedContactPermissions() {
    try {
      const contactPermissions = [
        { key: 'contact.list', name: 'Xem danh sách tickets', description: 'Quyền xem danh sách tickets liên hệ' },
        { key: 'contact.read', name: 'Xem chi tiết ticket', description: 'Quyền xem chi tiết ticket liên hệ' },
        { key: 'contact.update', name: 'Cập nhật ticket', description: 'Quyền cập nhật ticket (status, priority, assign)' },
        { key: 'contact.reply', name: 'Trả lời ticket', description: 'Quyền trả lời ticket liên hệ' },
        { key: 'contact.assign', name: 'Phân công ticket', description: 'Quyền phân công nhân viên xử lý ticket' },
        { key: 'contact.delete', name: 'Xóa ticket', description: 'Quyền xóa ticket liên hệ' },
      ];

      for (const perm of contactPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: contactPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Contact permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed contact permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho ContactTag
   */
  private async seedContactTagPermissions() {
    try {
      const contactTagPermissions = [
        { key: 'contact-tag.create', name: 'Tạo contact tag', description: 'Quyền tạo tag phân loại liên hệ' },
        { key: 'contact-tag.list', name: 'Xem danh sách contact tag', description: 'Quyền xem danh sách tag phân loại' },
        { key: 'contact-tag.read', name: 'Xem chi tiết contact tag', description: 'Quyền xem chi tiết tag' },
        { key: 'contact-tag.update', name: 'Cập nhật contact tag', description: 'Quyền cập nhật tag' },
        { key: 'contact-tag.delete', name: 'Xóa contact tag', description: 'Quyền xóa tag' },
      ];

      for (const perm of contactTagPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: contactTagPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ ContactTag permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed contact-tag permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các permissions cho QC Management module
   * - qc-management.list: Xem danh sách QC warehouses, rows
   * - qc-management.read: Xem chi tiết QC warehouse, row
   * - qc-management.assign: Gán/xóa user vào QC warehouse, row
   */
  private async seedQCManagementPermissions() {
    try {
      const qcManagementPermissions = [
        { key: 'qc-management.list', name: 'Xem danh sách QC', description: 'Quyền xem danh sách QC warehouses và rows' },
        { key: 'qc-management.read', name: 'Xem chi tiết QC', description: 'Quyền xem chi tiết QC warehouse và row' },
        { key: 'qc-management.assign', name: 'Phân công QC', description: 'Quyền gán/xóa user vào QC warehouse hoặc row' },
      ];

      for (const perm of qcManagementPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: qcManagementPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ QC Management permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed qc-management permissions: ${errorMessage}`);
    }
  }

  /**
   * Seed các QC Permissions mặc định cho QCPermission model
   * Đây là các quyền cho QC user được phân công quản lý kho
   */
  private async seedQCPermissions() {
    try {
      const qcPermissions = [
        { key: 'qc.import', name: 'Nhập hàng', description: 'Quyền nhập hàng vào kho/dãy' },
        { key: 'qc.export', name: 'Xuất hàng', description: 'Quyền xuất hàng từ kho/dãy' },
        { key: 'qc.view', name: 'Xem hàng', description: 'Quyền xem thông tin hàng hóa trong kho/dãy' },
        { key: 'qc.manage', name: 'Quản lý kho', description: 'Quyền quản lý kho/dãy (sắp xếp, kiểm kê)' },
        { key: 'qc.report', name: 'Báo cáo', description: 'Quyền xem và tạo báo cáo kho/dãy' },
      ];

      for (const perm of qcPermissions) {
        const existing = await this.qCPermission.findFirst({
          where: { key: perm.key, is_deleted: false },
        });

        if (!existing) {
          await this.qCPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
              created_by: 'SYSTEM',
            },
          });
        }
      }

      this.logger.log('✅ QC Permissions seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed QC permissions: ${errorMessage}`);
    }
  }
  /**
   * Seed các permissions cho RefundRequest
   */
  private async seedRefundRequestPermissions() {
    try {
      // 1. System Permissions (System & Admin)
      const systemPermissions = [
        {
          key: 'refund-request.list',
          name: 'Xem danh sách yêu cầu hoàn tiền',
          description: 'Quyền xem danh sách yêu cầu hoàn tiền',
        },
        {
          key: 'refund-request.read',
          name: 'Xem chi tiết yêu cầu hoàn tiền',
          description: 'Quyền xem chi tiết yêu cầu hoàn tiền',
        },
        {
          key: 'refund-request.accept',
          name: 'Duyệt yêu cầu hoàn tiền',
          description: 'Quyền duyệt yêu cầu hoàn tiền',
        },
        {
          key: 'refund-request.reject',
          name: 'Từ chối yêu cầu hoàn tiền',
          description: 'Quyền từ chối yêu cầu hoàn tiền',
        },
        {
          key: 'refund-request.change',
          name: 'Thay đổi trạng thái yêu cầu hoàn tiền',
          description: 'Quyền thay đổi trạng thái yêu cầu hoàn tiền',
        },
        {
          key: 'refund-request.delete',
          name: 'Xóa yêu cầu hoàn tiền',
          description: 'Quyền xóa yêu cầu hoàn tiền',
        },
      ];

      for (const perm of systemPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Assign to Admin/Super Admin
      const adminRoles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissionRecords = await this.permission.findMany({
        where: {
          key: { in: systemPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // 2. Organization Permissions
      const orgPermissions = [
        {
          key: 'refund-request.list',
          name: 'Xem danh sách yêu cầu hoàn tiền',
          description: 'Quyền xem danh sách yêu cầu hoàn tiền của tổ chức',
          allow_api_key: true,
        },
        {
          key: 'refund-request.read',
          name: 'Xem chi tiết yêu cầu hoàn tiền',
          description: 'Quyền xem chi tiết yêu cầu hoàn tiền của tổ chức',
          allow_api_key: true,
        },
      ];

      for (const perm of orgPermissions) {
        const existing = await this.organizationPermission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.organizationPermission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              allow_api_key: perm.allow_api_key,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ RefundRequest permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed refund-request permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Category
   */
  private async seedCategoryPermissions() {
    try {
      const categoryPermissions = [
        {
          key: 'category.create',
          name: 'Tạo chủ đề',
          description: 'Quyền tạo chủ đề bài viết',
        },
        {
          key: 'category.list',
          name: 'Xem danh sách chủ đề',
          description: 'Quyền xem danh sách chủ đề',
        },
        {
          key: 'category.read',
          name: 'Xem chi tiết chủ đề',
          description: 'Quyền xem chi tiết chủ đề',
        },
        {
          key: 'category.update',
          name: 'Cập nhật chủ đề',
          description: 'Quyền cập nhật chủ đề',
        },
        {
          key: 'category.delete',
          name: 'Xóa chủ đề',
          description: 'Quyền xóa chủ đề',
        },
      ];

      for (const perm of categoryPermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin roles
      const roles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: categoryPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of roles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      this.logger.log('✅ Category permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed category permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed các permissions cho Article
   */
  private async seedArticlePermissions() {
    try {
      const articlePermissions = [
        {
          key: 'article.create',
          name: 'Tạo bài viết',
          description: 'Quyền tạo bài viết',
        },
        {
          key: 'article.list',
          name: 'Xem danh sách bài viết',
          description: 'Quyền xem danh sách bài viết',
        },
        {
          key: 'article.read',
          name: 'Xem chi tiết bài viết',
          description: 'Quyền xem chi tiết bài viết',
        },
        {
          key: 'article.update',
          name: 'Cập nhật bài viết',
          description: 'Quyền cập nhật bài viết',
        },
        {
          key: 'article.delete',
          name: 'Xóa bài viết',
          description: 'Quyền xóa bài viết',
        },
        {
          key: 'article.admin',
          name: 'Quản trị bài viết',
          description: 'Quyền quản trị bài viết, bình luận, reactions',
        },
      ];

      for (const perm of articlePermissions) {
        const existing = await this.permission.findFirst({
          where: { key: perm.key },
        });

        if (!existing) {
          await this.permission.create({
            data: {
              key: perm.key,
              name: perm.name,
              description: perm.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      // Gán permissions cho Admin và Super Admin roles
      const roles = await this.role.findMany({
        where: {
          name: { in: ['Admin', 'Super Admin'] },
          is_deleted: false,
        },
      });

      const permissions = await this.permission.findMany({
        where: {
          key: { in: articlePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of roles) {
        for (const permission of permissions) {
          const existingAssignment = await this.rolePermission.findFirst({
            where: {
              role_id: role.id,
              permission_id: permission.id,
            },
          });

          if (!existingAssignment) {
            await this.rolePermission.create({
              data: {
                role_id: role.id,
                permission_id: permission.id,
                is_active: true,
                is_deleted: false,
              },
            });
          }
        }
      }

      // Seed default emojis
      await this.seedDefaultEmojis();

      this.logger.log('✅ Article permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed article permissions: ${errorMessage}`,
      );
    }
  }

  /**
   * Seed default emojis cho Article reactions
   */
  private async seedDefaultEmojis() {
    try {
      const defaultEmojis = [
        { emoji: '👍', name: 'like', order: 0 },
        { emoji: '❤️', name: 'love', order: 1 },
        { emoji: '😂', name: 'haha', order: 2 },
        { emoji: '😮', name: 'wow', order: 3 },
        { emoji: '😢', name: 'sad', order: 4 },
        { emoji: '😡', name: 'angry', order: 5 },
      ];

      for (const emojiData of defaultEmojis) {
        const existing = await this.articleEmoji.findFirst({
          where: { name: emojiData.name },
        });

        if (!existing) {
          await this.articleEmoji.create({
            data: {
              emoji: emojiData.emoji,
              name: emojiData.name,
              order: emojiData.order,
              is_active: true,
            },
          });
        }
      }

      this.logger.log('✅ Default emojis seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed default emojis: ${errorMessage}`);
    }
  }
}


interface VietMapProvince {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
}

interface VietMapWard {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
  parent_code: string;
}
