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
   * Seed các permissions cho WarehouseTemplate và gán vào Admin & Super Admin roles
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
          key: 'warehouse-template.read',
          name: 'Xem template kho hàng',
          description: 'Quyền xem danh sách và chi tiết template kho hàng',
        },
        {
          key: 'warehouse-template.update',
          name: 'Cập nhật template kho hàng',
          description: 'Quyền cập nhật thông tin và layout template kho hàng',
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
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed warehouse-template permissions: ${errorMessage}`,
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
