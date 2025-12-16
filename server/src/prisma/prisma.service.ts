import {
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { Client } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.initializeDatabase();
    await this.$connect();
    await this.seedDefaultRoles();
  }

  /**
   * Parse DATABASE_URL để lấy thông tin kết nối
   */
  private parseDatabaseUrl() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined');
    }

    // Parse URL: postgresql://user:password@host:port/database
    const regex = /^postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/;
    const match = databaseUrl.match(regex);

    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }

    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5],
    };
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

      await this.seedConfigPermissions();
      await this.seedWarehouseTemplatePermissions();
      await this.seedOrganizationPermissions();
      await this.seedNotificationPermissions();
      await this.seedRentalContractPermissions();
      await this.seedWarehousePermissions();
      await this.seedAmenityPermissions();
      await this.seedPartnerPermissions();
      await this.seedProductPermissions();
      await this.seedBatchPermissions();
      await this.seedApiKeyAdminPermissions();
      await this.seedVietnamAdministrative();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed default roles: ${errorMessage}`);
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
          key: 'amenity.list.all',
          name: 'Xem tất cả tiện ích',
          description: 'Quyền xem tất cả tiện ích bao gồm inactive',
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
