import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho Content-related Permissions
 * Bao gồm: faq, contact, contact-tag, category, article
 */
export class ContentPermissionsSeeder extends BaseSeeder {
    constructor(prisma: PrismaClient) {
        super(prisma, 'ContentPermissionsSeeder');
    }

    async run(): Promise<void> {
        await this.seedFaqPermissions();
        await this.seedContactPermissions();
        await this.seedContactTagPermissions();
        await this.seedCategoryPermissions();
        await this.seedArticlePermissions();
    }

    private async seedFaqPermissions() {
        try {
            const faqPermissions = [
                { key: 'faq.create', name: 'Tạo FAQ', description: 'Quyền tạo câu hỏi thường gặp mới' },
                { key: 'faq.list', name: 'Xem danh sách FAQ', description: 'Quyền xem danh sách FAQ' },
                { key: 'faq.read', name: 'Xem chi tiết FAQ', description: 'Quyền xem chi tiết FAQ' },
                { key: 'faq.update', name: 'Cập nhật FAQ', description: 'Quyền cập nhật FAQ' },
                { key: 'faq.delete', name: 'Xóa FAQ', description: 'Quyền xóa FAQ' },
            ];

            for (const perm of faqPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: faqPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ FAQ permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed faq permissions: ${errorMessage}`);
        }
    }

    private async seedContactPermissions() {
        try {
            const contactPermissions = [
                { key: 'contact.list', name: 'Xem danh sách tickets', description: 'Quyền xem danh sách tickets liên hệ' },
                { key: 'contact.read', name: 'Xem chi tiết ticket', description: 'Quyền xem chi tiết ticket liên hệ' },
                { key: 'contact.update', name: 'Cập nhật ticket', description: 'Quyền cập nhật ticket (status, priority, assign)' },
                { key: 'contact.reply', name: 'Trả lời ticket', description: 'Quyền trả lời ticket liên hệ' },
                { key: 'contact.assign', name: 'Phân công ticket', description: 'Quyền phân công nhân viên xử lý ticket' },
                { key: 'contact.delete', name: 'Xóa ticket', description: 'Quyền xóa ticket liên hệ' },
            ];

            for (const perm of contactPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: contactPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Contact permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed contact permissions: ${errorMessage}`);
        }
    }

    private async seedContactTagPermissions() {
        try {
            const contactTagPermissions = [
                { key: 'contact-tag.create', name: 'Tạo contact tag', description: 'Quyền tạo tag phân loại liên hệ' },
                { key: 'contact-tag.list', name: 'Xem danh sách contact tag', description: 'Quyền xem danh sách tag phân loại' },
                { key: 'contact-tag.read', name: 'Xem chi tiết contact tag', description: 'Quyền xem chi tiết tag' },
                { key: 'contact-tag.update', name: 'Cập nhật contact tag', description: 'Quyền cập nhật tag' },
                { key: 'contact-tag.delete', name: 'Xóa contact tag', description: 'Quyền xóa tag' },
            ];

            for (const perm of contactTagPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: contactTagPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ ContactTag permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed contact-tag permissions: ${errorMessage}`);
        }
    }

    private async seedCategoryPermissions() {
        try {
            const categoryPermissions = [
                { key: 'category.create', name: 'Tạo chủ đề', description: 'Quyền tạo chủ đề bài viết' },
                { key: 'category.list', name: 'Xem danh sách chủ đề', description: 'Quyền xem danh sách chủ đề' },
                { key: 'category.read', name: 'Xem chi tiết chủ đề', description: 'Quyền xem chi tiết chủ đề' },
                { key: 'category.update', name: 'Cập nhật chủ đề', description: 'Quyền cập nhật chủ đề' },
                { key: 'category.delete', name: 'Xóa chủ đề', description: 'Quyền xóa chủ đề' },
            ];

            for (const perm of categoryPermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: categoryPermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Category permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed category permissions: ${errorMessage}`);
        }
    }

    private async seedArticlePermissions() {
        try {
            const articlePermissions = [
                { key: 'article.create', name: 'Tạo bài viết', description: 'Quyền tạo mới bài viết' },
                { key: 'article.list', name: 'Xem danh sách bài viết (của mình)', description: 'Quyền xem danh sách bài viết do chính mình tạo' },
                { key: 'article.list.all', name: 'Xem tất cả bài viết', description: 'Quyền xem danh sách tất cả bài viết trên hệ thống' },
                { key: 'article.read', name: 'Xem chi tiết bài viết', description: 'Quyền xem chi tiết bài viết' },
                { key: 'article.update', name: 'Cập nhật bài viết (của mình)', description: 'Quyền cập nhật bài viết do chính mình tạo' },
                { key: 'article.update.all', name: 'Cập nhật tất cả bài viết', description: 'Quyền cập nhật bài viết của bất kỳ ai' },
                { key: 'article.delete', name: 'Xóa bài viết (của mình)', description: 'Quyền xóa bài viết do chính mình tạo' },
                { key: 'article.delete.all', name: 'Xóa tất cả bài viết', description: 'Quyền xóa bài viết của bất kỳ ai' },
                { key: 'article.publish', name: 'Xuất bản bài viết', description: 'Quyền xuất bản bài viết ra công khai' },
                { key: 'article.unpublish', name: 'Ẩn bài viết', description: 'Quyền ẩn bài viết đã xuất bản' },
            ];

            for (const perm of articlePermissions) {
                await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
            }

            const adminRoles = await this.getAdminRoles();
            const permissions = await this.prisma.permission.findMany({
                where: { key: { in: articlePermissions.map((p) => p.key) }, is_deleted: false },
            });

            for (const role of adminRoles) {
                for (const permission of permissions) {
                    await this.assignPermissionToRole(role.id, permission.id);
                }
            }

            this.logger.log('✅ Article permissions seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed article permissions: ${errorMessage}`);
        }
    }
}
