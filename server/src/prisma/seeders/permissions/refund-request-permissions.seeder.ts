import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Refund Request Permissions
 * Bao gồm: refund-request (org-level) và admin-level permissions
 */
export class RefundRequestPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'RefundRequestPermissionsSeeder');
  }

  async run(): Promise<void> {
    try {
      // Org-level permissions - quyền cho tổ chức (member dùng)
      const orgLevelPermissions = [
        {
          key: 'refund-request.create',
          name: 'Tạo yêu cầu hoàn tiền',
          description: 'Quyền tạo yêu cầu hoàn tiền hợp đồng',
        },
        {
          key: 'refund-request.list',
          name: 'Xem danh sách yêu cầu hoàn tiền',
          description: 'Quyền xem danh sách yêu cầu hoàn tiền của tổ chức',
        },
        {
          key: 'refund-request.read',
          name: 'Xem chi tiết yêu cầu hoàn tiền',
          description: 'Quyền xem chi tiết yêu cầu hoàn tiền của tổ chức',
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

      // System-level permissions - quyền cho admin
      const adminSystemPermissions = [
        {
          key: 'refund-request.list.all',
          name: 'Xem tất cả yêu cầu hoàn tiền',
          description:
            'Quyền xem danh sách tất cả yêu cầu hoàn tiền trên hệ thống',
        },
        {
          key: 'refund-request.read.all',
          name: 'Xem chi tiết yêu cầu hoàn tiền bất kỳ',
          description: 'Quyền xem chi tiết bất kỳ yêu cầu hoàn tiền nào',
        },
        {
          key: 'refund-request.approve',
          name: 'Duyệt yêu cầu hoàn tiền',
          description: 'Quyền duyệt/từ chối yêu cầu hoàn tiền',
        },
        {
          key: 'refund-request.delete',
          name: 'Xóa yêu cầu hoàn tiền',
          description: 'Quyền xóa yêu cầu hoàn tiền',
        },
      ];

      for (const perm of adminSystemPermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      // Gán admin permissions chỉ cho Admin và Super Admin
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

      this.logger.log('✅ Refund Request permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed refund-request permissions: ${errorMessage}`,
      );
    }
  }
}
