import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Notification Permissions
 */
export class NotificationPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'NotificationPermissionsSeeder');
    }

    async run(): Promise<void> {
        try {
            // Global Notification permissions - Admin only
            const globalNotificationPermissions = [
                { key: 'global-notification.create', name: 'Tạo thông báo toàn cầu', description: 'Quyền tạo thông báo toàn cầu' },
                { key: 'global-notification.list', name: 'Xem danh sách thông báo toàn cầu', description: 'Quyền xem danh sách thông báo toàn cầu' },
                { key: 'global-notification.read', name: 'Xem chi tiết thông báo toàn cầu', description: 'Quyền xem chi tiết thông báo toàn cầu' },
                { key: 'global-notification.update', name: 'Cập nhật thông báo toàn cầu', description: 'Quyền cập nhật thông báo toàn cầu' },
                { key: 'global-notification.delete', name: 'Xóa thông báo toàn cầu', description: 'Quyền xóa thông báo toàn cầu' },
            ];

            // User Notification admin permissions
            const userNotificationAdminPermissions = [
                { key: 'user-notification.list.all', name: 'Xem thông báo của tất cả user', description: 'Quyền xem danh sách thông báo của bất kỳ user nào' },
                { key: 'user-notification.send', name: 'Gửi thông báo cho user', description: 'Quyền gửi thông báo cho user bất kỳ' },
            ];

            const allNotificationPermissions = [...globalNotificationPermissions, ...userNotificationAdminPermissions];

            for (const perm of allNotificationPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            // Gán cho Admin và Super Admin roles
            const adminRoles = await this.getAdminRoles();
            const permissionRecords = await this.prisma.permission.findMany({
                where: { key: { in: allNotificationPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissionRecords) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Notification permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed notification permissions: ${errorMessage}`);
        }
    }
}
