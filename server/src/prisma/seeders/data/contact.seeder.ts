import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Contact Tags
 */
export class ContactSeeder extends BaseSeeder {
    private adminId: string | null = null;

    constructor(prisma: PrismaClient) {
        super(prisma, 'ContactSeeder');
    }

    setAdminId(adminId: string) {
        this.adminId = adminId;
    }

    async run(): Promise<void> {
        if (process.env.SEED_CONTACT_TAGS !== 'true') return;

        try {
            const existingCount = await this.prisma.contactTag.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) return;

            const tags = [
                { name: 'Hỏi giá', description: 'Khách hàng hỏi về giá cả dịch vụ', color: '#3B82F6' },
                { name: 'Khiếu nại', description: 'Phản ánh, khiếu nại về dịch vụ', color: '#EF4444' },
                { name: 'Hỗ trợ kỹ thuật', description: 'Yêu cầu hỗ trợ kỹ thuật', color: '#8B5CF6' },
                { name: 'Tư vấn thuê kho', description: 'Tư vấn về dịch vụ thuê kho', color: '#10B981' },
                { name: 'Hợp tác kinh doanh', description: 'Đề xuất hợp tác kinh doanh', color: '#F59E0B' },
            ];

            await this.prisma.contactTag.createMany({
                data: tags.map((t) => ({
                    ...t,
                    created_by: this.adminId,
                    is_active: true,
                    is_deleted: false,
                })),
            });

            this.logger.log('✅ Contact tags seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed contact tags: ${errorMessage}`);
        }
    }
}
