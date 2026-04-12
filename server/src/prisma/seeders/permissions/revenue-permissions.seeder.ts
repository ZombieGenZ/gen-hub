import { PrismaClient } from '@prisma/client';
import { BaseSeeder } from '../base.seeder';

/**
 * Seeder cho Revenue Analytics permissions
 * Bao gồm: revenue.analytics.view
 */
export class RevenuePermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'RevenuePermissionsSeeder');
  }

  async run(): Promise<void> {
    try {
      const revenuePermissions = [
        {
          key: 'revenue.analytics.view',
          name: 'Xem báo cáo doanh thu',
          description: 'Quyền xem dashboard báo cáo doanh thu và dòng tiền',
        },
      ];

      for (const permission of revenuePermissions) {
        await this.createPermissionIfNotExists(
          permission.key,
          permission.name,
          permission.description,
        );
      }

      const adminRoles = await this.getAdminRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: revenuePermissions.map((permission) => permission.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      this.logger.log('✅ Revenue analytics permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed revenue analytics permissions: ${errorMessage}`,
      );
    }
  }
}
