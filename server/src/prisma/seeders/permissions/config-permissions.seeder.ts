import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Config Permissions
 */
export class ConfigPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'ConfigPermissionsSeeder');
  }

  async run(): Promise<void> {
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
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      const superAdminRole = await this.getRoleByName('Super Admin');

      if (superAdminRole) {
        const permissions = await this.prisma.permission.findMany({
          where: {
            key: { in: configPermissions.map((p) => p.key) },
            is_deleted: false,
          },
        });

        for (const permission of permissions) {
          await this.assignPermissionToRole(superAdminRole.id, permission.id);
        }
      }

      this.logger.log('✅ Config permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed config permissions: ${errorMessage}`,
      );
    }
  }
}
