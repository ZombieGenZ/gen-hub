import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Payment-related Permissions
 * Bao gồm: payment, refund-request, api-key
 */
export class PaymentPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'PaymentPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedPaymentPermissions();
        await this.seedRefundRequestPermissions();
        await this.seedApiKeyPermissions();
    }

    private async seedPaymentPermissions() {
        try {
            // System permissions
            const systemPaymentPermissions = [
                { key: 'payment.list', name: 'Xem danh sách thanh toán', description: 'Quyền xem danh sách giao dịch thanh toán' },
                { key: 'payment.list.all', name: 'Xem tất cả thanh toán (Admin)', description: 'Quyền xem tất cả giao dịch thanh toán trong hệ thống' },
                { key: 'payment.read', name: 'Xem chi tiết thanh toán', description: 'Quyền xem chi tiết giao dịch thanh toán' },
                { key: 'payment.refund', name: 'Hoàn tiền giao dịch', description: 'Quyền xử lý hoàn tiền giao dịch' },
                { key: 'payment.manual.accept', name: 'Chủ động accept thanh toán', description: 'Quyền admin chủ động accept payment và thực hiện toàn bộ logic hoàn thành đơn hàng' },
                { key: 'payment.manual.reject', name: 'Chủ động reject thanh toán', description: 'Quyền admin chủ động reject payment và thực hiện toàn bộ logic hủy đơn hàng' },
            ];

            for (const perm of systemPaymentPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: systemPaymentPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            // Org-level permissions
            const orgPaymentPermissions = [
                { key: 'payment.list', name: 'Xem danh sách thanh toán', description: 'Quyền xem danh sách giao dịch thanh toán của tổ chức', allow_api_key: true },
                { key: 'payment.read', name: 'Xem chi tiết thanh toán', description: 'Quyền xem chi tiết giao dịch thanh toán của tổ chức', allow_api_key: true },
            ];

            for (const perm of orgPaymentPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({ where: { key: perm.key } });
                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: perm.allow_api_key, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Payment permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed payment permissions: ${errorMessage}`);
        }
    }

    private async seedRefundRequestPermissions() {
        try {
            // System permissions
            const systemPermissions = [
                { key: 'refund-request.list', name: 'Xem danh sách yêu cầu hoàn tiền', description: 'Quyền xem danh sách yêu cầu hoàn tiền' },
                { key: 'refund-request.read', name: 'Xem chi tiết yêu cầu hoàn tiền', description: 'Quyền xem chi tiết yêu cầu hoàn tiền' },
                { key: 'refund-request.accept', name: 'Duyệt yêu cầu hoàn tiền', description: 'Quyền duyệt yêu cầu hoàn tiền' },
                { key: 'refund-request.reject', name: 'Từ chối yêu cầu hoàn tiền', description: 'Quyền từ chối yêu cầu hoàn tiền' },
                { key: 'refund-request.change', name: 'Thay đổi trạng thái yêu cầu hoàn tiền', description: 'Quyền thay đổi trạng thái yêu cầu hoàn tiền' },
                { key: 'refund-request.delete', name: 'Xóa yêu cầu hoàn tiền', description: 'Quyền xóa yêu cầu hoàn tiền' },
            ];

            for (const perm of systemPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissionRecords = await this.prisma.permission.findMany({
                where: { key: { in: systemPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissionRecords) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            // Org-level permissions
            const orgPermissions = [
                { key: 'refund-request.list', name: 'Xem danh sách yêu cầu hoàn tiền', description: 'Quyền xem danh sách yêu cầu hoàn tiền của tổ chức', allow_api_key: true },
                { key: 'refund-request.read', name: 'Xem chi tiết yêu cầu hoàn tiền', description: 'Quyền xem chi tiết yêu cầu hoàn tiền của tổ chức', allow_api_key: true },
            ];

            for (const perm of orgPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({ where: { key: perm.key } });
                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, allow_api_key: perm.allow_api_key, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ RefundRequest permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed refund-request permissions: ${errorMessage}`);
        }
    }

    private async seedApiKeyPermissions() {
        try {
            const apiKeyPermissions = [
                { key: 'api-key.create', name: 'Tạo API key', description: 'Quyền tạo API key hệ thống' },
                { key: 'api-key.list', name: 'Xem danh sách API key', description: 'Quyền xem danh sách API key' },
                { key: 'api-key.read', name: 'Xem chi tiết API key', description: 'Quyền xem chi tiết API key' },
                { key: 'api-key.update', name: 'Cập nhật API key', description: 'Quyền cập nhật API key' },
                { key: 'api-key.revoke', name: 'Thu hồi API key', description: 'Quyền thu hồi API key' },
                { key: 'api-key.delete', name: 'Xóa API key', description: 'Quyền xóa API key' },
            ];

            for (const perm of apiKeyPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: apiKeyPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ API Key permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed api-key permissions: ${errorMessage}`);
        }
    }
}
