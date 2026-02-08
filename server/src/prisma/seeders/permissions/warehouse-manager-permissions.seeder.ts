import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Warehouse Manager-related Permissions
 * Bao gồm: warehouse-manager, warehouse-visit, warehouse-manager-role
 */
export class WarehouseManagerPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'WarehouseManagerPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedWarehouseManagerPermissions();
        await this.seedWarehouseVisitPermissions();
        await this.seedWarehouseManagerRolePermissions();
        await this.seedWarehouseViewPermissions();
    }

    /**
     * Seed Warehouse View permissions cho Warehouse Manager
     * Đây là permissions dùng với @RequireWMPermission decorator
     */
    private async seedWarehouseViewPermissions() {
        try {
            const warehouseViewPermissions = [
                { key: 'warehouse.view', name: 'Xem kho hàng', description: 'Quyền xem thông tin kho hàng được gán' },
                { key: 'warehouse.view.rows', name: 'Xem danh sách hàng', description: 'Quyền xem danh sách hàng trong kho' },
                { key: 'warehouse.view.racks', name: 'Xem danh sách kệ', description: 'Quyền xem danh sách kệ trong hàng' },
                { key: 'warehouse.view.shelves', name: 'Xem danh sách shelf', description: 'Quyền xem danh sách ngăn trong kệ' },
                { key: 'warehouse.view.blocks', name: 'Xem danh sách block', description: 'Quyền xem danh sách ô trong ngăn' },
            ];

            for (const perm of warehouseViewPermissions) {
                const existing = await this.prisma.warehouseManagerPermission.findFirst({
                    where: { key: perm.key },
                });

                if (!existing) {
                    await this.prisma.warehouseManagerPermission.create({
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

            this.logger.log('✅ Warehouse View permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warehouse view permissions: ${errorMessage}`);
        }
    }

    private async seedWarehouseManagerPermissions() {
        try {
            const warehouseManagerPermissions = [
                { key: 'warehouse-manager.create', name: 'Gán người quản lý kho', description: 'Quyền gán người dùng làm người quản lý kho' },
                { key: 'warehouse-manager.list', name: 'Xem danh sách người quản lý kho (của mình)', description: 'Quyền xem danh sách những người quản lý kho do chính mình tạo' },
                { key: 'warehouse-manager.list.all', name: 'Xem tất cả người quản lý kho', description: 'Quyền xem danh sách tất cả người quản lý kho của mọi người' },
                { key: 'warehouse-manager.read', name: 'Xem chi tiết người quản lý kho (của mình)', description: 'Quyền xem chi tiết thông tin và vai trò của người quản lý kho do chính mình tạo' },
                { key: 'warehouse-manager.read.all', name: 'Xem chi tiết tất cả người quản lý kho', description: 'Quyền xem chi tiết thông tin người quản lý kho của bất kỳ ai' },
                { key: 'warehouse-manager.update', name: 'Cập nhật người quản lý kho (của mình)', description: 'Quyền cập nhật thông tin người quản lý kho do chính mình tạo' },
                { key: 'warehouse-manager.update.all', name: 'Cập nhật tất cả người quản lý kho', description: 'Quyền cập nhật thông tin người quản lý kho của bất kỳ ai' },
                { key: 'warehouse-manager.delete', name: 'Xóa người quản lý kho (của mình)', description: 'Quyền gỡ bỏ người quản lý khỏi kho hàng do chính mình tạo' },
                { key: 'warehouse-manager.delete.all', name: 'Xóa tất cả người quản lý kho', description: 'Quyền gỡ bỏ người quản lý khỏi kho hàng của bất kỳ ai' },
                { key: 'warehouse-manager.assign-role', name: 'Gán vai trò quản lý kho', description: 'Quyền gán các vai trò cụ thể cho người quản lý kho' },
            ];

            for (const perm of warehouseManagerPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: warehouseManagerPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Warehouse Manager permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warehouse-manager permissions: ${errorMessage}`);
        }
    }

    private async seedWarehouseVisitPermissions() {
        try {
            const warehouseVisitPermissions = [
                { key: 'warehouse-visit.create', name: 'Đặt lịch tham quan kho', description: 'Quyền tạo yêu cầu đặt lịch tham quan kho hàng' },
                { key: 'warehouse-visit.list', name: 'Xem danh sách lịch tham quan (của mình)', description: 'Quyền xem danh sách các lịch tham quan do mình tạo' },
                { key: 'warehouse-visit.list.all', name: 'Xem tất cả lịch tham quan', description: 'Quyền xem toàn bộ danh sách lịch tham quan trên hệ thống' },
                { key: 'warehouse-visit.read', name: 'Xem chi tiết lịch tham quan (của mình)', description: 'Quyền xem chi tiết thông tin một lịch tham quan do chính mình tạo' },
                { key: 'warehouse-visit.read.all', name: 'Xem chi tiết tất cả lịch tham quan', description: 'Quyền xem chi tiết thông tin lịch tham quan của bất kỳ ai' },
                { key: 'warehouse-visit.update', name: 'Cập nhật lịch tham quan (của mình)', description: 'Quyền cập nhật trạng thái hoặc thông tin lịch tham quan do chính mình tạo' },
                { key: 'warehouse-visit.update.all', name: 'Cập nhật tất cả lịch tham quan', description: 'Quyền cập nhật lịch tham quan của bất kỳ ai' },
                { key: 'warehouse-visit.reschedule', name: 'Dời lịch tham quan', description: 'Quyền thay đổi thời gian tham quan kho hàng' },
                { key: 'warehouse-visit.delete', name: 'Hủy lịch tham quan (của mình)', description: 'Quyền hủy hoặc xóa lịch tham quan kho do chính mình tạo' },
                { key: 'warehouse-visit.delete.all', name: 'Hủy tất cả lịch tham quan', description: 'Quyền hủy hoặc xóa lịch tham quan của bất kỳ ai' },
            ];

            for (const perm of warehouseVisitPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: warehouseVisitPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Warehouse Visit permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warehouse-visit permissions: ${errorMessage}`);
        }
    }

    private async seedWarehouseManagerRolePermissions() {
        try {
            const warehouseManagerRolePermissions = [
                { key: 'warehouse-manager-role.create', name: 'Tạo vai trò quản lý kho', description: 'Quyền tạo mới vai trò cho người quản lý kho' },
                { key: 'warehouse-manager-role.list', name: 'Xem danh sách vai trò quản lý kho', description: 'Quyền xem danh sách vai trò quản lý kho' },
                { key: 'warehouse-manager-role.read', name: 'Xem chi tiết vai trò quản lý kho', description: 'Quyền xem chi tiết vai trò quản lý kho' },
                { key: 'warehouse-manager-role.update', name: 'Cập nhật vai trò quản lý kho', description: 'Quyền cập nhật vai trò quản lý kho' },
                { key: 'warehouse-manager-role.delete', name: 'Xóa vai trò quản lý kho', description: 'Quyền xóa vai trò quản lý kho' },
            ];

            for (const perm of warehouseManagerRolePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: warehouseManagerRolePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Warehouse Manager Role permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warehouse-manager-role permissions: ${errorMessage}`);
        }
    }
}
