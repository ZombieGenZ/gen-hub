import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Rental Duration Tiers (Gói thuê theo thời gian)
 */
export class RentalSeeder extends BaseSeeder {
    private adminId: string | null = null;

    constructor(prisma: PrismaClient) {
        super(prisma, 'RentalSeeder');
    }

    setAdminId(adminId: string) {
        this.adminId = adminId;
    }

    async run(): Promise<void> {
        if (process.env.SEED_RENTAL_DURATION_TIERS !== 'true') return;

        try {
            const existingCount = await this.prisma.rentalDurationTier.count({
                where: { is_deleted: false },
            });

            if (existingCount > 0) return;

            const tiers = [
                { name: '1 tháng', duration_value: 1, duration_unit: 'MONTH' as const, discount_percent: 0, description: 'Thuê ngắn hạn 1 tháng' },
                { name: '3 tháng', duration_value: 3, duration_unit: 'MONTH' as const, discount_percent: 5, description: 'Giảm 5% khi thuê 3 tháng' },
                { name: '6 tháng', duration_value: 6, duration_unit: 'MONTH' as const, discount_percent: 10, description: 'Giảm 10% khi thuê 6 tháng' },
                { name: '1 năm', duration_value: 1, duration_unit: 'YEAR' as const, discount_percent: 15, description: 'Giảm 15% khi thuê 1 năm' },
                { name: '2 năm', duration_value: 2, duration_unit: 'YEAR' as const, discount_percent: 20, description: 'Giảm 20% khi thuê 2 năm' },
            ];

            await this.prisma.rentalDurationTier.createMany({
                data: tiers.map((t) => ({
                    ...t,
                    created_by: this.adminId,
                    is_active: true,
                    is_deleted: false,
                })),
            });

            this.logger.log('✅ Rental duration tiers seeded');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`❌ Failed to seed rental duration tiers: ${errorMessage}`);
        }
    }
}
