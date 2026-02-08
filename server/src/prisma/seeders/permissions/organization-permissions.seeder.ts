import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Organization Permissions
 * Bao gồm: organization, organization-balance, organization-update-request
 */
export class OrganizationPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'OrganizationPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedOrganizationPermissions();
        await this.seedOrganizationBalancePermissions();
        await this.seedOrganizationUpdateRequestPermissions();
    }

    /**
     * Seed các permissions cho Organization
     */
    private async seedOrganizationPermissions() {
        try {
            // Permissions cơ bản cho tất cả user
            const basicPermissions = [
                { key: 'organization.create', name: 'Tạo tổ chức', description: 'Quyền tạo mới tổ chức' },
                { key: 'organization.list', name: 'Xem danh sách tổ chức', description: 'Quyền xem danh sách tổ chức của mình' },
                { key: 'organization.read', name: 'Xem chi tiết tổ chức', description: 'Quyền xem chi tiết tổ chức của mình' },
                { key: 'organization.update', name: 'Cập nhật tổ chức', description: 'Quyền cập nhật tổ chức của mình' },
                { key: 'organization.delete', name: 'Xóa tổ chức', description: 'Quyền xóa tổ chức của mình' },
            ];

            // Permissions đặc biệt chỉ cho Admin và Super Admin
            const adminPermissions = [
                { key: 'organization.list.all', name: 'Xem tất cả tổ chức', description: 'Quyền xem danh sách tất cả tổ chức trên hệ thống' },
                { key: 'organization.read.all', name: 'Xem chi tiết tất cả tổ chức', description: 'Quyền xem chi tiết bất kỳ tổ chức nào trên hệ thống' },
                { key: 'organization.update.all', name: 'Cập nhật tất cả tổ chức', description: 'Quyền cập nhật bất kỳ tổ chức nào trên hệ thống' },
                { key: 'organization.delete.all', name: 'Xóa tất cả tổ chức', description: 'Quyền xóa bất kỳ tổ chức nào trên hệ thống' },
                { key: 'organization.update_request.list', name: 'Xem danh sách yêu cầu cập nhật', description: 'Quyền xem danh sách yêu cầu cập nhật thông tin tổ chức' },
                { key: 'organization.update_request.read', name: 'Xem chi tiết yêu cầu cập nhật', description: 'Quyền xem chi tiết yêu cầu cập nhật thông tin tổ chức' },
                { key: 'organization.update_request.approve', name: 'Duyệt yêu cầu cập nhật', description: 'Quyền duyệt yêu cầu cập nhật thông tin tổ chức' },
                { key: 'organization.update_request.reject', name: 'Từ chối yêu cầu cập nhật', description: 'Quyền từ chối yêu cầu cập nhật thông tin tổ chức' },
            ];

            const allSystemPermissions = [...basicPermissions, ...adminPermissions];

            // Tạo system permissions
            for (const perm of allSystemPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            // Gán basic permissions cho tất cả roles
            const allRoles = await this.getAllRoles();
            const basicPermissionRecords = await this.prisma.permission.findMany({
                where: { key: { in: basicPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of allRoles) {
                for (const permission of basicPermissionRecords) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            // Gán admin permissions chỉ cho Admin và Super Admin
            const adminRoles = await this.getAdminRoles();
            const adminPermissionRecords = await this.prisma.permission.findMany({
                where: { key: { in: adminPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of adminPermissionRecords) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            // Org-level permissions
            const orgLevelPermissions = [
                // Member management
                { key: 'organization.member.invite', name: 'Mời thành viên', description: 'Quyền mời thành viên vào tổ chức' },
                { key: 'organization.member.invite.remove', name: 'Hủy lời mời', description: 'Quyền hủy lời mời thành viên' },
                { key: 'organization.member.list', name: 'Xem danh sách thành viên', description: 'Quyền xem danh sách thành viên' },
                { key: 'organization.member.role.assign', name: 'Gán vai trò cho thành viên', description: 'Quyền gán vai trò cho thành viên' },
                { key: 'organization.member.permission.assign', name: 'Gán quyền cho thành viên', description: 'Quyền gán quyền trực tiếp cho thành viên' },
                { key: 'organization.member.remove', name: 'Xóa thành viên', description: 'Quyền xóa thành viên khỏi tổ chức' },
                // Role management
                { key: 'organization.role.list', name: 'Xem danh sách vai trò', description: 'Quyền xem danh sách vai trò' },
                { key: 'organization.role.read', name: 'Xem chi tiết vai trò', description: 'Quyền xem chi tiết vai trò' },
                { key: 'organization.role.create', name: 'Tạo vai trò', description: 'Quyền tạo vai trò trong tổ chức' },
                { key: 'organization.role.update', name: 'Cập nhật vai trò', description: 'Quyền cập nhật vai trò' },
                { key: 'organization.role.delete', name: 'Xóa vai trò', description: 'Quyền xóa vai trò' },
                // API Key management
                { key: 'organization.apikey.create', name: 'Tạo API key', description: 'Quyền tạo API key' },
                { key: 'organization.apikey.read', name: 'Xem danh sách API key', description: 'Quyền xem danh sách API key' },
                { key: 'organization.apikey.update', name: 'Cập nhật API key', description: 'Quyền cập nhật API key' },
                { key: 'organization.apikey.reset', name: 'Reset API key', description: 'Quyền reset API key' },
                { key: 'organization.apikey.delete', name: 'Xóa API key', description: 'Quyền xóa API key' },
                // Organization Notification management
                { key: 'organization.notification.create', name: 'Tạo thông báo tổ chức', description: 'Quyền tạo thông báo cho tổ chức' },
                { key: 'organization.notification.list', name: 'Xem danh sách thông báo', description: 'Quyền xem danh sách thông báo tổ chức' },
                { key: 'organization.notification.read', name: 'Xem chi tiết thông báo', description: 'Quyền xem chi tiết thông báo tổ chức' },
                { key: 'organization.notification.update', name: 'Cập nhật thông báo', description: 'Quyền cập nhật thông báo tổ chức' },
                { key: 'organization.notification.delete', name: 'Xóa thông báo', description: 'Quyền xóa thông báo tổ chức' },
                // Chat management (Agora RTM + RTC)
                { key: 'chat.view', name: 'Xem tin nhắn chat', description: 'Quyền xem tin nhắn trong chat tổ chức', allow_api_key: true },
                { key: 'chat.send', name: 'Gửi tin nhắn chat', description: 'Quyền gửi tin nhắn trong chat tổ chức', allow_api_key: true },
                { key: 'chat.delete', name: 'Xóa tin nhắn chat', description: 'Quyền xóa tin nhắn trong chat tổ chức', allow_api_key: true },
                { key: 'chat.call.view', name: 'Xem cuộc gọi', description: 'Quyền xem thông tin cuộc gọi', allow_api_key: true },
                { key: 'chat.call.start', name: 'Bắt đầu cuộc gọi', description: 'Quyền bắt đầu cuộc gọi voice/video', allow_api_key: false },
                { key: 'chat.call.join', name: 'Tham gia cuộc gọi', description: 'Quyền tham gia cuộc gọi đang diễn ra', allow_api_key: false },
            ];

            for (const perm of orgLevelPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({ where: { key: perm.key } });
                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: {
                            key: perm.key,
                            name: perm.name,
                            description: perm.description,
                            allow_api_key: (perm as { allow_api_key?: boolean }).allow_api_key ?? true,
                            is_active: true,
                            is_deleted: false,
                        },
                    });
                }
            }

            this.logger.log('✅ Organization permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed organization permissions: ${errorMessage}`);
        }
    }

    /**
     * Seed các permissions cho Organization Balance (Admin only)
     */
    private async seedOrganizationBalancePermissions() {
        try {
            const organizationBalancePermissions = [
                { key: 'organization-balance.list', name: 'Xem danh sách số dư tổ chức', description: 'Quyền xem danh sách số dư tổ chức' },
                { key: 'organization-balance.read', name: 'Xem chi tiết số dư tổ chức', description: 'Quyền xem chi tiết số dư tổ chức' },
                { key: 'organization-balance.update', name: 'Cập nhật số dư tổ chức', description: 'Quyền cập nhật số dư tổ chức' },
                { key: 'organization-balance.history', name: 'Xem lịch sử giao dịch', description: 'Quyền xem lịch sử giao dịch tổ chức' },
            ];

            for (const perm of organizationBalancePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            // Chỉ gán cho Admin và Super Admin
            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: organizationBalancePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Organization Balance permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed organization-balance permissions: ${errorMessage}`);
        }
    }

    /**
     * Seed các permissions cho Organization Update Request
     */
    private async seedOrganizationUpdateRequestPermissions() {
        try {
            // Org-level permissions
            const orgPermissions = [
                { key: 'organization.update_request.create', name: 'Tạo yêu cầu cập nhật', description: 'Quyền tạo yêu cầu cập nhật thông tin tổ chức' },
                { key: 'organization.update_request.list', name: 'Xem danh sách yêu cầu', description: 'Quyền xem danh sách yêu cầu cập nhật' },
                { key: 'organization.update_request.read', name: 'Xem chi tiết yêu cầu', description: 'Quyền xem chi tiết yêu cầu cập nhật' },
                { key: 'organization.update_request.cancel', name: 'Hủy yêu cầu cập nhật', description: 'Quyền hủy yêu cầu cập nhật' },
            ];

            for (const perm of orgPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({ where: { key: perm.key } });
                if (!existing) {
                    await this.prisma.organizationPermission.create({
                        data: { key: perm.key, name: perm.name, description: perm.description, is_active: true, is_deleted: false },
                    });
                }
            }

            this.logger.log('✅ Organization Update Request permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed organization update request permissions: ${errorMessage}`);
        }
    }
}
