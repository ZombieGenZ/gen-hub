import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho các System Permissions
 * Bao gồm: database.admin, featureflag.admin, resources.admin, systemlogs.admin, backup.admin, superadmin.bypass
 */
export class SystemPermissionsSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient, adminId?: string | null) {
    super(prisma, 'SystemPermissionsSeeder');
    this.adminId = adminId || null;
  }

  async run(): Promise<void> {
    await this.seedDatabaseAdminPermission();
    await this.seedFeatureFlagPermission();
    await this.seedResourcesAdminPermission();
    await this.seedSystemLogsAdminPermission();
    await this.seedBackupAdminPermission();
    await this.seedSuperadminBypassPermission();
  }

  /**
   * Seed permission database.admin cho Database Panel
   */
  private async seedDatabaseAdminPermission() {
    try {
      const permissionId = await this.createPermissionIfNotExists(
        'database.admin',
        'Database Admin',
        'Quyền truy cập vào Database Panel',
      );

      if (permissionId) {
        const superAdminRole = await this.getRoleByName('Super Admin');
        if (superAdminRole) {
          await this.assignPermissionToRole(superAdminRole.id, permissionId);
          this.logger.log(
            '✅ Database admin permission assigned to Super Admin',
          );
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
      const permissionId = await this.createPermissionIfNotExists(
        'featureflag.admin',
        'Feature Flag Admin',
        'Quyền quản lý bật/tắt các API endpoints',
      );

      if (permissionId) {
        const superAdminRole = await this.getRoleByName('Super Admin');
        if (superAdminRole) {
          await this.assignPermissionToRole(superAdminRole.id, permissionId);
          this.logger.log(
            '✅ Feature flag admin permission assigned to Super Admin',
          );
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
      const permissionId = await this.createPermissionIfNotExists(
        'resources.admin',
        'Resources Admin',
        'Quyền truy cập vào Resources Panel để giám sát tài nguyên hệ thống',
      );

      if (permissionId) {
        const superAdminRole = await this.getRoleByName('Super Admin');
        if (superAdminRole) {
          await this.assignPermissionToRole(superAdminRole.id, permissionId);
          this.logger.log(
            '✅ Resources admin permission assigned to Super Admin',
          );
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
      const permissionId = await this.createPermissionIfNotExists(
        'systemlogs.admin',
        'System Logs Admin',
        'Quyền truy cập vào System Logs để xem log hệ thống',
      );

      if (permissionId) {
        const superAdminRole = await this.getRoleByName('Super Admin');
        if (superAdminRole) {
          await this.assignPermissionToRole(superAdminRole.id, permissionId);
          this.logger.log(
            '✅ System logs admin permission assigned to Super Admin',
          );
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
      const permissionId = await this.createPermissionIfNotExists(
        'backup.admin',
        'Backup Admin',
        'Quyền quản lý backup database (list, trigger, download)',
      );

      if (permissionId) {
        const superAdminRole = await this.getRoleByName('Super Admin');
        if (superAdminRole) {
          await this.assignPermissionToRole(superAdminRole.id, permissionId);
          this.logger.log('✅ Backup admin permission assigned to Super Admin');
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
   * Seed permission superadmin.bypass cho việc bảo vệ super admin
   * User có quyền này sẽ không thể bị ban/warn/update permissions bởi các admin khác
   * Gán trực tiếp cho tài khoản admin được seed
   */
  private async seedSuperadminBypassPermission() {
    try {
      const permissionId = await this.createPermissionIfNotExists(
        'superadmin.bypass',
        'Superadmin Bypass',
        'Bảo vệ người dùng khỏi các hành động quản lý như ban, warn, update permissions',
      );

      // Gán trực tiếp cho admin account đã seed
      if (permissionId && this.adminId) {
        await this.assignPermissionToUser(this.adminId, permissionId);
        this.logger.log(
          '✅ Superadmin bypass permission assigned to admin account',
        );
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed superadmin bypass permission: ${errorMessage}`,
      );
    }
  }
}
