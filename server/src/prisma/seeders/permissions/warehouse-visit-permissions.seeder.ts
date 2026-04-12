import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Warehouse Visit Permissions
 * Bao gồm: warehouse-visit (org-level) và admin-level permissions
 */
export class WarehouseVisitPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'WarehouseVisitPermissionsSeeder');
  }

  async run(): Promise<void> {
    try {
      // Org-level permissions
      const orgLevelPermissions = [
        {
          key: 'warehouse-visit.create',
          name: 'Đặt lịch tham quan kho',
          description: 'Quyền đặt lịch tham quan kho',
        },
        {
          key: 'warehouse-visit.list',
          name: 'Xem danh sách lịch tham quan',
          description: 'Quyền xem danh sách lịch tham quan của tổ chức',
        },
        {
          key: 'warehouse-visit.read',
          name: 'Xem chi tiết lịch tham quan',
          description: 'Quyền xem chi tiết lịch tham quan của tổ chức',
        },
        {
          key: 'warehouse-visit.cancel',
          name: 'Hủy lịch tham quan',
          description: 'Quyền hủy lịch tham quan của tổ chức',
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

      // System-level admin permissions
      const adminSystemPermissions = [
        {
          key: 'warehouse-visit.list.all',
          name: 'Xem tất cả lịch tham quan',
          description:
            'Quyền xem danh sách tất cả lịch tham quan trên hệ thống',
        },
        {
          key: 'warehouse-visit.read.all',
          name: 'Xem chi tiết lịch tham quan bất kỳ',
          description: 'Quyền xem chi tiết bất kỳ lịch tham quan nào',
        },
        {
          key: 'warehouse-visit.update',
          name: 'Cập nhật lịch tham quan',
          description: 'Quyền xác nhận/từ chối/hoàn thành lịch tham quan',
        },
        {
          key: 'warehouse-visit.delete',
          name: 'Xóa lịch tham quan',
          description: 'Quyền xóa lịch tham quan',
        },
      ];

      for (const perm of adminSystemPermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

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

      this.logger.log('✅ Warehouse Visit permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed warehouse-visit permissions: ${errorMessage}`,
      );
    }
  }
}
