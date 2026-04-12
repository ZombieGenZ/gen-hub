import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

export class OrgAnalyticsPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'OrgAnalyticsPermissionsSeeder');
  }

  async run(): Promise<void> {
    try {
      // Org-level permissions
      const orgLevelPermissions = [
        {
          key: 'org.analytics.view',
          name: 'Xem dashboard thống kê',
          description:
            'Quyền xem số liệu thống kê chung, KPI và biểu đồ hoạt động của tổ chức.',
        },
      ];

      for (const perm of orgLevelPermissions) {
        const existing = await this.prisma.organizationPermission.findFirst({
          where: { key: perm.key },
        });
        if (!existing) {
          await this.prisma.organizationPermission.create({
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

      // System-level permissions for Admin
      const adminSystemPermissions = [
        {
          key: 'org.analytics.view.all',
          name: 'Xem thống kê khách hàng (Hệ thống)',
          description:
            'Quyền xem thống kê hoạt động của bất kỳ khách hàng nào trên toàn hệ thống.',
        },
      ];

      for (const perm of adminSystemPermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      // Gán quyền admin system cho Admin và Super Admin roles
      const adminRoles = await this.getAdminRoles();
      const adminPermissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: adminSystemPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of adminPermissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      this.logger.log('✅ Org Analytics permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed org-analytics permissions: ${errorMessage}`,
      );
    }
  }
}
