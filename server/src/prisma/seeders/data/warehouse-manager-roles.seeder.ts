import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Warehouse Manager Roles data
 */
export class WarehouseManagerRolesSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'WarehouseManagerRolesSeeder');
    }

    async run(): Promise<void> {
        if (process.env.SEED_WAREHOUSE_MANAGER_ROLES !== 'true') return;

        try {
            const existingCount = await this.prisma.warehouseManagerRole.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) return;

            const roles = [
                { name: 'Quản lý kho', description: 'Quyền quản lý toàn bộ hoạt động kho hàng' },
                { name: 'Nhân viên nhập kho', description: 'Quyền thực hiện các nghiệp vụ nhập kho' },
                { name: 'Nhân viên xuất kho', description: 'Quyền thực hiện các nghiệp vụ xuất kho' },
                { name: 'Nhân viên kiểm kê', description: 'Quyền kiểm tra và đối chiếu hàng tồn kho' },
                { name: 'Nhân viên bảo trì', description: 'Quyền bảo trì và bảo dưỡng kho hàng' },
            ];

            await this.prisma.warehouseManagerRole.createMany({
                data: roles.map((r) => ({
                    ...r,
                    is_active: true,
                    is_deleted: false,
                })),
            });

            this.logger.log('✅ Warehouse manager roles seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warehouse manager roles: ${errorMessage}`);
        }
    }
}
