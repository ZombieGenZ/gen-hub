import { PrismaClient } from '@prisma/client';
import { BaseSeeder } from '../base.seeder';

export class InventoryWarehouseManagerPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'InventoryWarehouseManagerPermissionsSeeder');
  }

  async run(): Promise<void> {
    try {
      const permissions = [
        {
          key: 'warehouse-manager.inventory.inbound.receive',
          name: 'Kiểm đếm nhập kho',
          description: 'Thực hiện kiểm đếm hàng khi nhập kho',
        },
        {
          key: 'warehouse-manager.inventory.inbound.putaway',
          name: 'Cất hàng nhập kho',
          description: 'Thực hiện cất hàng lên kệ',
        },
        {
          key: 'warehouse-manager.inventory.outbound.pick',
          name: 'Nhặt hàng xuất kho',
          description: 'Thực hiện nhặt hàng theo phiếu',
        },
        {
          key: 'warehouse-manager.inventory.outbound.check',
          name: 'Kiểm tra xuất kho',
          description: 'Kiểm tra hàng trước khi xuất',
        },
        {
          key: 'warehouse-manager.inventory.outbound.ship',
          name: 'Hoàn tất xuất kho',
          description: 'Bàn giao và hoàn tất xuất kho',
        },
      ];

      for (const permission of permissions) {
        const existing = await this.prisma.warehouseManagerPermission.findFirst(
          {
            where: { key: permission.key },
          },
        );

        if (!existing) {
          await this.prisma.warehouseManagerPermission.create({
            data: {
              key: permission.key,
              name: permission.name,
              description: permission.description,
              is_active: true,
              is_deleted: false,
            },
          });
        }
      }

      this.logger.log('✅ Inventory warehouse-manager permissions seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed inventory warehouse-manager permissions: ${errorMessage}`,
      );
    }
  }
}
