import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Inventory Permissions (Org-level)
 * Bao gồm: org.inventory.inbound.*, org.inventory.outbound.*
 */
export class InventoryPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'InventoryPermissionsSeeder');
  }

  async run(): Promise<void> {
    await this.seedInventoryOrgPermissions();
  }

  /**
   * Seed các org-level permissions cho Inventory Request module
   */
  private async seedInventoryOrgPermissions() {
    try {
      const orgLevelPermissions = [
        // Inbound
        {
          key: 'org.inventory.inbound.list',
          name: 'Xem danh sách phiếu nhập kho',
          description:
            'Quyền xem danh sách phiếu nhập kho và danh sách kho của tổ chức',
          allow_api_key: true,
        },
        {
          key: 'org.inventory.inbound.create',
          name: 'Tạo phiếu nhập kho',
          description: 'Quyền tạo yêu cầu nhập hàng vào kho',
          allow_api_key: true,
        },
        // Outbound
        {
          key: 'org.inventory.outbound.list',
          name: 'Xem danh sách phiếu xuất kho',
          description: 'Quyền xem danh sách phiếu xuất kho của tổ chức',
          allow_api_key: true,
        },
        {
          key: 'org.inventory.outbound.create',
          name: 'Tạo phiếu xuất kho',
          description: 'Quyền tạo yêu cầu xuất hàng khỏi kho',
          allow_api_key: true,
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
              allow_api_key: perm.allow_api_key,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Inventory permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed inventory permissions: ${errorMessage}`,
      );
    }
  }
}
