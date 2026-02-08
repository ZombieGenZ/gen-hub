import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho App Download Permissions
 * Quản lý quyền phân phối ứng dụng via email invite
 */
export class AppDownloadPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'AppDownloadPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedAppDownloadPermissions();
    }

    /**
     * Seed các permissions cho App Download module
     */
    private async seedAppDownloadPermissions() {
        try {
            const appDownloadPermissions = [
                {
                    key: 'app-download.list',
                    name: 'Xem danh sách chia sẻ app',
                    description: 'Quyền xem danh sách các lượt chia sẻ/mời tải app'
                },
                {
                    key: 'app-download.read',
                    name: 'Xem chi tiết chia sẻ app',
                    description: 'Quyền xem chi tiết một lượt chia sẻ/mời tải app'
                },
                {
                    key: 'app-download.invite',
                    name: 'Tạo và gửi lời mời tải app',
                    description: 'Quyền tạo mới và gửi lại lời mời tải app qua email'
                },
                {
                    key: 'app-download.delete',
                    name: 'Xóa lời mời tải app',
                    description: 'Quyền xóa lời mời tải app'
                },
            ];

            for (const perm of appDownloadPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            // Gán cho Admin và Super Admin roles
            const adminRoles = await this.getAdminRoles();
            const permissionRecords = await this.prisma.permission.findMany({
                where: { key: { in: appDownloadPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissionRecords) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ App Download permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed app-download permissions: ${errorMessage}`);
        }
    }
}
