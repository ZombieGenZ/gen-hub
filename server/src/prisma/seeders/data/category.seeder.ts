import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Category (Danh mục bài viết)
 */
export class CategorySeeder extends BaseSeeder {
    private adminId: string | null = null;

    constructor(prisma: PrismaClient) {
        super(prisma, 'CategorySeeder');
    }

    setAdminId(adminId: string) {
        this.adminId = adminId;
    }

    async run(): Promise<void> {
        if (process.env.SEED_CATEGORIES !== 'true') return;

        try {
            const existingCount = await this.prisma.category.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) return;

            const categories = [
                { name: 'Tin tức', description: 'Tin tức về công ty và ngành logistics', slug: 'tin-tuc' },
                { name: 'Hướng dẫn sử dụng', description: 'Hướng dẫn sử dụng hệ thống', slug: 'huong-dan-su-dung' },
                { name: 'Mẹo vặt lưu kho', description: 'Các mẹo hay về lưu trữ hàng hóa', slug: 'meo-vat-luu-kho' },
                { name: 'Chính sách & Quy định', description: 'Các chính sách và quy định của dịch vụ', slug: 'chinh-sach-quy-dinh' },
                { name: 'Khuyến mãi', description: 'Các chương trình khuyến mãi', slug: 'khuyen-mai' },
            ];

            await this.prisma.category.createMany({
                data: categories.map((c) => ({
                    ...c,
                    created_by: this.adminId,
                    is_active: true,
                    is_deleted: false,
                })),
            });

            this.logger.log('✅ Categories seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed categories: ${errorMessage}`);
        }
    }
}
