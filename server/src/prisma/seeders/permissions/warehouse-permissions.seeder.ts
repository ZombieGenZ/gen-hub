import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Warehouse và Template Permissions
 * Bao gồm: warehouse, warehouse-template, row-template, rack-template, shelf-template, block-template
 */
export class WarehousePermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'WarehousePermissionsSeeder');
  }

  async run(): Promise<void> {
    await this.seedWarehousePermissions();
    await this.seedWarehouseTemplatePermissions();
    await this.seedRowTemplatePermissions();
    await this.seedRackTemplatePermissions();
    await this.seedShelfTemplatePermissions();
    await this.seedBlockTemplatePermissions();
  }

  /**
   * Seed các permissions cho Warehouse module
   */
  private async seedWarehousePermissions() {
    try {
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

      for (const perm of warehousePermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      // Gán cho tất cả roles
      const allRoles = await this.getAllRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: warehousePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of allRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      // Tạo org-level permissions cho warehouse
      const orgLevelWarehousePermissions = [
        {
          key: 'warehouse.list',
          name: 'Xem danh sách kho',
          description: 'Quyền xem danh sách kho trong tổ chức',
        },
        {
          key: 'warehouse.read',
          name: 'Xem chi tiết kho',
          description: 'Quyền xem chi tiết kho trong tổ chức',
        },
        {
          key: 'warehouse.update',
          name: 'Cập nhật kho',
          description: 'Quyền cập nhật kho trong tổ chức',
        },
        {
          key: 'warehouse.delete',
          name: 'Xóa kho',
          description: 'Quyền xóa kho trong tổ chức',
        },
        {
          key: 'warehouse.layout.view',
          name: 'Xem layout kho',
          description: 'Quyền xem sơ đồ bố trí kho trong tổ chức',
        },
      ];

      for (const perm of orgLevelWarehousePermissions) {
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
   * Seed các permissions cho WarehouseTemplate
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
          name: 'Xem danh sách template kho hàng (của mình)',
          description:
            'Quyền xem danh sách template kho hàng do chính mình tạo',
        },
        {
          key: 'warehouse-template.list.all',
          name: 'Xem tất cả template kho hàng',
          description: 'Quyền xem tất cả template kho hàng của mọi người',
        },
        {
          key: 'warehouse-template.read',
          name: 'Xem chi tiết template kho hàng (của mình)',
          description: 'Quyền xem chi tiết template kho hàng do chính mình tạo',
        },
        {
          key: 'warehouse-template.read.all',
          name: 'Xem chi tiết tất cả template kho hàng',
          description: 'Quyền xem chi tiết template kho hàng của bất kỳ ai',
        },
        {
          key: 'warehouse-template.update',
          name: 'Cập nhật template kho hàng (của mình)',
          description: 'Quyền cập nhật template kho hàng do chính mình tạo',
        },
        {
          key: 'warehouse-template.update.all',
          name: 'Cập nhật tất cả template kho hàng',
          description: 'Quyền cập nhật template kho hàng của bất kỳ ai',
        },
        {
          key: 'warehouse-template.design',
          name: 'Thiết kế layout template kho hàng',
          description:
            'Quyền thiết kế layout (rows, racks, shelves, blocks) template kho hàng',
        },
        {
          key: 'warehouse-template.delete',
          name: 'Xóa template kho hàng (của mình)',
          description: 'Quyền xóa template kho hàng do chính mình tạo',
        },
        {
          key: 'warehouse-template.delete.all',
          name: 'Xóa tất cả template kho hàng',
          description: 'Quyền xóa template kho hàng của bất kỳ ai',
        },
      ];

      for (const perm of warehouseTemplatePermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      const adminRoles = await this.getAdminRoles();
      const permissions = await this.prisma.permission.findMany({
        where: {
          key: { in: warehouseTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissions) {
          await this.assignPermissionToRole(role.id, permission.id);
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
          name: 'Xem danh sách dãy template (của mình)',
          description:
            'Quyền xem danh sách dãy của warehouse template do chính mình tạo',
        },
        {
          key: 'row-template.list.all',
          name: 'Xem tất cả dãy template',
          description: 'Quyền xem danh sách tất cả dãy của mọi người',
        },
        {
          key: 'row-template.read',
          name: 'Xem chi tiết dãy template (của mình)',
          description: 'Quyền xem chi tiết dãy do chính mình tạo',
        },
        {
          key: 'row-template.read.all',
          name: 'Xem chi tiết tất cả dãy template',
          description: 'Quyền xem chi tiết dãy của bất kỳ ai',
        },
        {
          key: 'row-template.update',
          name: 'Cập nhật dãy template (của mình)',
          description: 'Quyền cập nhật dãy do chính mình tạo',
        },
        {
          key: 'row-template.update.all',
          name: 'Cập nhật tất cả dãy template',
          description: 'Quyền cập nhật dãy của bất kỳ ai',
        },
        {
          key: 'row-template.delete',
          name: 'Xóa dãy template (của mình)',
          description: 'Quyền xóa dãy do chính mình tạo',
        },
        {
          key: 'row-template.delete.all',
          name: 'Xóa tất cả dãy template',
          description: 'Quyền xóa dãy của bất kỳ ai',
        },
      ];

      for (const perm of rowTemplatePermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      const adminRoles = await this.getAdminRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: rowTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
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
          name: 'Xem danh sách kệ template (của mình)',
          description: 'Quyền xem danh sách kệ của dãy do chính mình tạo',
        },
        {
          key: 'rack-template.list.all',
          name: 'Xem tất cả kệ template',
          description: 'Quyền xem danh sách tất cả kệ của mọi người',
        },
        {
          key: 'rack-template.read',
          name: 'Xem chi tiết kệ template (của mình)',
          description: 'Quyền xem chi tiết kệ do chính mình tạo',
        },
        {
          key: 'rack-template.read.all',
          name: 'Xem chi tiết tất cả kệ template',
          description: 'Quyền xem chi tiết kệ của bất kỳ ai',
        },
        {
          key: 'rack-template.update',
          name: 'Cập nhật kệ template (của mình)',
          description: 'Quyền cập nhật kệ do chính mình tạo',
        },
        {
          key: 'rack-template.update.all',
          name: 'Cập nhật tất cả kệ template',
          description: 'Quyền cập nhật kệ của bất kỳ ai',
        },
        {
          key: 'rack-template.delete',
          name: 'Xóa kệ template (của mình)',
          description: 'Quyền xóa kệ do chính mình tạo',
        },
        {
          key: 'rack-template.delete.all',
          name: 'Xóa tất cả kệ template',
          description: 'Quyền xóa kệ của bất kỳ ai',
        },
      ];

      for (const perm of rackTemplatePermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      const adminRoles = await this.getAdminRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: rackTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
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
          name: 'Xem danh sách tầng template (của mình)',
          description: 'Quyền xem danh sách tầng của kệ do chính mình tạo',
        },
        {
          key: 'shelf-template.list.all',
          name: 'Xem tất cả tầng template',
          description: 'Quyền xem danh sách tất cả tầng của mọi người',
        },
        {
          key: 'shelf-template.read',
          name: 'Xem chi tiết tầng template (của mình)',
          description: 'Quyền xem chi tiết tầng do chính mình tạo',
        },
        {
          key: 'shelf-template.read.all',
          name: 'Xem chi tiết tất cả tầng template',
          description: 'Quyền xem chi tiết tầng của bất kỳ ai',
        },
        {
          key: 'shelf-template.update',
          name: 'Cập nhật tầng template (của mình)',
          description: 'Quyền cập nhật tầng do chính mình tạo',
        },
        {
          key: 'shelf-template.update.all',
          name: 'Cập nhật tất cả tầng template',
          description: 'Quyền cập nhật tầng của bất kỳ ai',
        },
        {
          key: 'shelf-template.delete',
          name: 'Xóa tầng template (của mình)',
          description: 'Quyền xóa tầng do chính mình tạo',
        },
        {
          key: 'shelf-template.delete.all',
          name: 'Xóa tất cả tầng template',
          description: 'Quyền xóa tầng của bất kỳ ai',
        },
      ];

      for (const perm of shelfTemplatePermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      const adminRoles = await this.getAdminRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: shelfTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
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
          name: 'Xem danh sách ô template (của mình)',
          description: 'Quyền xem danh sách ô của tầng do chính mình tạo',
        },
        {
          key: 'block-template.list.all',
          name: 'Xem tất cả ô template',
          description: 'Quyền xem danh sách tất cả ô của mọi người',
        },
        {
          key: 'block-template.read',
          name: 'Xem chi tiết ô template (của mình)',
          description: 'Quyền xem chi tiết ô do chính mình tạo',
        },
        {
          key: 'block-template.read.all',
          name: 'Xem chi tiết tất cả ô template',
          description: 'Quyền xem chi tiết ô của bất kỳ ai',
        },
        {
          key: 'block-template.update',
          name: 'Cập nhật ô template (của mình)',
          description: 'Quyền cập nhật ô do chính mình tạo',
        },
        {
          key: 'block-template.update.all',
          name: 'Cập nhật tất cả ô template',
          description: 'Quyền cập nhật ô của bất kỳ ai',
        },
        {
          key: 'block-template.delete',
          name: 'Xóa ô template (của mình)',
          description: 'Quyền xóa ô do chính mình tạo',
        },
        {
          key: 'block-template.delete.all',
          name: 'Xóa tất cả ô template',
          description: 'Quyền xóa ô của bất kỳ ai',
        },
      ];

      for (const perm of blockTemplatePermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      const adminRoles = await this.getAdminRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: blockTemplatePermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
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
}
