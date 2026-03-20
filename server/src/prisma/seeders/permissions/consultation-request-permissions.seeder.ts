import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Consultation Request Permissions
 */
export class ConsultationRequestPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'ConsultationRequestPermissionsSeeder');
    }

    async run(): Promise<void> {
        try {
            // Org-level permissions
            const orgLevelPermissions = [
                { key: 'consultation-request.create', name: 'Gửi yêu cầu tư vấn', description: 'Quyền gửi yêu cầu tư vấn kho bãi' },
                { key: 'consultation-request.list', name: 'Xem danh sách yêu cầu tư vấn', description: 'Quyền xem danh sách yêu cầu tư vấn của tổ chức' },
                { key: 'consultation-request.read', name: 'Xem chi tiết yêu cầu tư vấn', description: 'Quyền xem chi tiết yêu cầu tư vấn của tổ chức' },
            ];

            for (const perm of orgLevelPermissions) {
                const existing = await this.prisma.organizationPermission.findFirst({ where: { key: perm.key } });
                if (!existing) {
                    await this.prisma.organizationPermission.create({
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

            // System-level admin permissions
            const adminSystemPermissions = [
                { key: 'consultation-request.list.all', name: 'Xem tất cả yêu cầu tư vấn', description: 'Quyền xem danh sách tất cả yêu cầu tư vấn trên hệ thống' },
                { key: 'consultation-request.read.all', name: 'Xem chi tiết yêu cầu tư vấn bất kỳ', description: 'Quyền xem chi tiết bất kỳ yêu cầu tư vấn nào' },
                { key: 'consultation-request.update', name: 'Cập nhật yêu cầu tư vấn', description: 'Quyền cập nhật trạng thái yêu cầu tư vấn và phân công nhân viên' },
                { key: 'consultation-request.delete', name: 'Xóa yêu cầu tư vấn', description: 'Quyền xóa yêu cầu tư vấn' },
            ];

            for (const perm of adminSystemPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const adminPermissionRecords = await this.prisma.permission.findMany({
                where: { key: { in: adminSystemPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of adminPermissionRecords) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Consultation Request permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed consultation-request permissions: ${errorMessage}`);
        }
    }
}
