import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Rental Permissions
 * Bao gồm: rental-contract, rental-duration-tier
 */
export class RentalPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'RentalPermissionsSeeder');
  }

  async run(): Promise<void> {
    await this.seedRentalContractPermissions();
    await this.seedRentalDurationTierPermissions();
  }

  /**
   * Seed các permissions cho Rental Contract
   */
  private async seedRentalContractPermissions() {
    try {
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

      for (const perm of allSystemPermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      // Gán basic permissions cho tất cả roles
      const allRoles = await this.getAllRoles();
      const basicPermissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: basicPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of allRoles) {
        for (const permission of basicPermissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      // Gán admin permissions chỉ cho Admin và Super Admin
      const adminRoles = await this.getAdminRoles();
      const adminPermissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: adminPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of adminPermissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      // Tạo org-level permissions cho rental contract
      const orgLevelRentalPermissions = [
        {
          key: 'rental-contract.list',
          name: 'Xem danh sách hợp đồng',
          description: 'Quyền xem danh sách hợp đồng trong tổ chức',
        },
        {
          key: 'rental-contract.read',
          name: 'Xem chi tiết hợp đồng',
          description: 'Quyền xem chi tiết hợp đồng trong tổ chức',
        },
        {
          key: 'rental-contract.create',
          name: 'Tạo hợp đồng thuê',
          description: 'Quyền tạo hợp đồng thuê trong tổ chức',
        },
        {
          key: 'rental-contract.update',
          name: 'Cập nhật hợp đồng',
          description: 'Quyền cập nhật hợp đồng trong tổ chức',
        },
        {
          key: 'rental-contract.delete',
          name: 'Hủy hợp đồng',
          description: 'Quyền hủy hợp đồng trong tổ chức',
        },
      ];

      for (const perm of orgLevelRentalPermissions) {
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
   * Seed các permissions cho RentalDurationTier
   */
  private async seedRentalDurationTierPermissions() {
    try {
      const rentalDurationTierPermissions = [
        {
          key: 'rental-duration-tier.create',
          name: 'Tạo tier thời gian thuê',
          description: 'Quyền tạo mới tier thời gian thuê',
        },
        {
          key: 'rental-duration-tier.list',
          name: 'Xem danh sách tier',
          description: 'Quyền xem danh sách tier thời gian thuê',
        },
        {
          key: 'rental-duration-tier.read',
          name: 'Xem chi tiết tier',
          description: 'Quyền xem chi tiết tier thời gian thuê',
        },
        {
          key: 'rental-duration-tier.update',
          name: 'Cập nhật tier',
          description: 'Quyền cập nhật tier thời gian thuê',
        },
        {
          key: 'rental-duration-tier.delete',
          name: 'Xóa tier',
          description: 'Quyền xóa tier thời gian thuê',
        },
      ];

      for (const perm of rentalDurationTierPermissions) {
        await this.createPermissionIfNotExists(
          perm.key,
          perm.name,
          perm.description,
        );
      }

      // Chỉ gán cho Admin và Super Admin
      const adminRoles = await this.getAdminRoles();
      const permissionRecords = await this.prisma.permission.findMany({
        where: {
          key: { in: rentalDurationTierPermissions.map((p) => p.key) },
          is_deleted: false,
        },
      });

      for (const role of adminRoles) {
        for (const permission of permissionRecords) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      this.logger.log('✅ Rental duration tier permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed rental-duration-tier permissions: ${errorMessage}`,
      );
    }
  }
}
