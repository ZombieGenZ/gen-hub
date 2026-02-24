import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Product-related Permissions (Organization-level)
 * Bao gồm: partner, product, batch, inventory
 */
export class ProductPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'ProductPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedPartnerPermissions();
        await this.seedProductPermissions();
        await this.seedUnitPermissions();
        await this.seedBatchPermissions();
        await this.seedInventoryPermissions();
    }

    private async seedPartnerPermissions() {
        try {
            const partnerPermissions = [
                { key: 'partner.create', name: 'Tạo đối tác', description: 'Quyền tạo đối tác mới' },
                { key: 'partner.list', name: 'Xem danh sách đối tác', description: 'Quyền xem danh sách đối tác' },
                { key: 'partner.read', name: 'Xem chi tiết đối tác', description: 'Quyền xem chi tiết đối tác' },
                { key: 'partner.update', name: 'Cập nhật đối tác', description: 'Quyền cập nhật đối tác' },
                { key: 'partner.delete', name: 'Xóa đối tác', description: 'Quyền xóa đối tác' },
            ];

            for (const perm of partnerPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({
                    where: { key: perm.key, is_deleted: false },
                });

                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: true, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Partner permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed partner permissions: ${errorMessage}`);
        }
    }

    private async seedProductPermissions() {
        try {
            const productPermissions = [
                { key: 'product.create', name: 'Tạo sản phẩm', description: 'Quyền tạo sản phẩm mới' },
                { key: 'product.list', name: 'Xem danh sách sản phẩm', description: 'Quyền xem danh sách sản phẩm' },
                { key: 'product.read', name: 'Xem chi tiết sản phẩm', description: 'Quyền xem chi tiết sản phẩm' },
                { key: 'product.update', name: 'Cập nhật sản phẩm', description: 'Quyền cập nhật sản phẩm' },
                { key: 'product.delete', name: 'Xóa sản phẩm', description: 'Quyền xóa sản phẩm' },
            ];

            for (const perm of productPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({
                    where: { key: perm.key, is_deleted: false },
                });

                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: true, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Product permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed product permissions: ${errorMessage}`);
        }
    }

    private async seedUnitPermissions() {
        try {
            const unitPermissions = [
                { key: 'unit.create', name: 'Tạo đơn vị tính', description: 'Quyền tạo đơn vị tính mới' },
                { key: 'unit.list', name: 'Xem danh sách đơn vị tính', description: 'Quyền xem danh sách đơn vị tính' },
                { key: 'unit.read', name: 'Xem chi tiết đơn vị tính', description: 'Quyền xem chi tiết đơn vị tính' },
                { key: 'unit.update', name: 'Cập nhật đơn vị tính', description: 'Quyền cập nhật đơn vị tính' },
                { key: 'unit.delete', name: 'Xóa đơn vị tính', description: 'Quyền xóa đơn vị tính' },
            ];

            for (const perm of unitPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({
                    where: { key: perm.key, is_deleted: false },
                });

                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: true, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Unit permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed unit permissions: ${errorMessage}`);
        }
    }

    private async seedBatchPermissions() {
        try {
            const batchPermissions = [
                { key: 'batch.create', name: 'Tạo lô hàng', description: 'Quyền tạo lô hàng mới' },
                { key: 'batch.list', name: 'Xem danh sách lô hàng', description: 'Quyền xem danh sách lô hàng' },
                { key: 'batch.read', name: 'Xem chi tiết lô hàng', description: 'Quyền xem chi tiết lô hàng' },
                { key: 'batch.update', name: 'Cập nhật lô hàng', description: 'Quyền cập nhật lô hàng' },
                { key: 'batch.delete', name: 'Xóa lô hàng', description: 'Quyền xóa lô hàng' },
            ];

            for (const perm of batchPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({
                    where: { key: perm.key, is_deleted: false },
                });

                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: true, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Batch permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed batch permissions: ${errorMessage}`);
        }
    }

    private async seedInventoryPermissions() {
        try {
            // Organization-level permissions
            const inventoryOrgPermissions = [
                { key: 'inventory.request.create', name: 'Tạo yêu cầu nhập/xuất kho', description: 'Quyền tạo yêu cầu nhập hoặc xuất kho' },
                { key: 'inventory.request.list', name: 'Xem danh sách yêu cầu', description: 'Quyền xem danh sách yêu cầu nhập/xuất kho' },
                { key: 'inventory.request.read', name: 'Xem chi tiết yêu cầu', description: 'Quyền xem chi tiết yêu cầu nhập/xuất kho' },
                { key: 'inventory.request.confirm', name: 'Xác nhận yêu cầu', description: 'Quyền xác nhận yêu cầu nhập/xuất kho' },
                { key: 'inventory.request.reject', name: 'Từ chối yêu cầu', description: 'Quyền từ chối yêu cầu nhập/xuất kho' },
                { key: 'inventory.fill', name: 'Nhập kho', description: 'Quyền thực hiện nhập kho' },
                { key: 'inventory.pick', name: 'Xuất kho', description: 'Quyền thực hiện xuất kho' },
                { key: 'inventory.view', name: 'Xem tồn kho', description: 'Quyền xem thông tin tồn kho' },
                { key: 'inventory.history', name: 'Xem lịch sử kho', description: 'Quyền xem lịch sử nhập/xuất kho' },
            ];

            for (const perm of inventoryOrgPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({
                    where: { key: perm.key, is_deleted: false },
                });

                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: true, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Inventory permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed inventory permissions: ${errorMessage}`);
        }
    }
}
