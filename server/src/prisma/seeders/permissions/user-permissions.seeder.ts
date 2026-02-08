import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho User-related Permissions
 * Bao gồm: user-management, role, warning-category, warn-penalty
 */
export class UserPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'UserPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedUserManagementPermissions();
        await this.seedRolePermissions();
        await this.seedWarningCategoryPermissions();
        await this.seedWarnPenaltyPermissions();
    }

    private async seedUserManagementPermissions() {
        try {
            const userManagementPermissions = [
                { key: 'user-management.list', name: 'Xem danh sách người dùng', description: 'Quyền xem danh sách tất cả người dùng' },
                { key: 'user-management.read', name: 'Xem chi tiết người dùng', description: 'Quyền xem thông tin chi tiết của người dùng' },
                { key: 'user-management.ban', name: 'Cấm người dùng', description: 'Quyền cấm (ban) người dùng' },
                { key: 'user-management.unban', name: 'Gỡ cấm người dùng', description: 'Quyền gỡ lệnh cấm (unban) người dùng' },
                { key: 'user-management.warn', name: 'Cảnh báo người dùng', description: 'Quyền cảnh báo (warn) người dùng' },
                { key: 'user-management.unwarn', name: 'Gỡ cảnh báo người dùng', description: 'Quyền gỡ cảnh báo (unwarn) người dùng' },
                { key: 'user-management.sessions', name: 'Quản lý phiên đăng nhập', description: 'Quyền xem và quản lý phiên đăng nhập của người dùng' },
            ];

            for (const perm of userManagementPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: userManagementPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ User management permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed user management permissions: ${errorMessage}`);
        }
    }

    private async seedRolePermissions() {
        try {
            const rolePermissions = [
                { key: 'role.create', name: 'Tạo vai trò', description: 'Quyền tạo mới vai trò' },
                { key: 'role.list', name: 'Xem danh sách vai trò', description: 'Quyền xem danh sách vai trò' },
                { key: 'role.read', name: 'Xem chi tiết vai trò', description: 'Quyền xem chi tiết vai trò' },
                { key: 'role.update', name: 'Cập nhật vai trò', description: 'Quyền cập nhật vai trò' },
                { key: 'role.delete', name: 'Xóa vai trò', description: 'Quyền xóa vai trò' },
                { key: 'role.assign', name: 'Gán vai trò cho user', description: 'Quyền gán vai trò cho người dùng' },
            ];

            for (const perm of rolePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: rolePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Role permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed role permissions: ${errorMessage}`);
        }
    }

    private async seedWarningCategoryPermissions() {
        try {
            const warningCategoryPermissions = [
                { key: 'warning-category.create', name: 'Tạo danh mục cảnh báo', description: 'Quyền tạo mới danh mục cảnh báo' },
                { key: 'warning-category.list', name: 'Xem danh mục cảnh báo', description: 'Quyền xem danh sách và chi tiết danh mục cảnh báo' },
                { key: 'warning-category.update', name: 'Cập nhật danh mục cảnh báo', description: 'Quyền cập nhật danh mục cảnh báo' },
                { key: 'warning-category.delete', name: 'Xóa danh mục cảnh báo', description: 'Quyền xóa danh mục cảnh báo' },
            ];

            for (const perm of warningCategoryPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: warningCategoryPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Warning category permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warning category permissions: ${errorMessage}`);
        }
    }

    private async seedWarnPenaltyPermissions() {
        try {
            const warnPenaltyPermissions = [
                { key: 'warn-penalty.create', name: 'Tạo quy tắc phạt warn', description: 'Quyền tạo mới quy tắc phạt khi bị warn' },
                { key: 'warn-penalty.list', name: 'Xem quy tắc phạt warn', description: 'Quyền xem danh sách và chi tiết quy tắc phạt warn' },
                { key: 'warn-penalty.read', name: 'Xem chi tiết quy tắc phạt warn', description: 'Quyền xem chi tiết quy tắc phạt warn' },
                { key: 'warn-penalty.update', name: 'Cập nhật quy tắc phạt warn', description: 'Quyền cập nhật quy tắc phạt warn' },
                { key: 'warn-penalty.delete', name: 'Xóa quy tắc phạt warn', description: 'Quyền xóa quy tắc phạt warn' },
            ];

            for (const perm of warnPenaltyPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: warnPenaltyPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Warn penalty permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed warn-penalty permissions: ${errorMessage}`);
        }
    }
}
