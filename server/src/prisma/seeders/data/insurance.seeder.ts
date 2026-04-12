import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Insurance (Bảo hiểm)
 */
export class InsuranceSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'InsuranceSeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  async run(): Promise<void> {
    if (process.env.SEED_INSURANCES !== 'true') return;

    try {
      const existingCount = await this.prisma.insurance.count({
        where: { is_deleted: false },
      });

      if (existingCount > 0) return;

      const insurances = [
        {
          name: 'Bảo hiểm cháy nổ',
          description: 'Bồi thường thiệt hại do cháy nổ',
          price: 500000,
          coverage_amount: 500000000,
          premium_rate: 0.1,
        },
        {
          name: 'Bảo hiểm thiên tai',
          description: 'Bồi thường thiệt hại do thiên tai',
          price: 400000,
          coverage_amount: 300000000,
          premium_rate: 0.08,
        },
        {
          name: 'Bảo hiểm trộm cắp',
          description: 'Bồi thường khi hàng hóa bị trộm cắp',
          price: 300000,
          coverage_amount: 200000000,
          premium_rate: 0.12,
        },
        {
          name: 'Bảo hiểm toàn diện',
          description: 'Bảo hiểm tất cả rủi ro',
          price: 1000000,
          coverage_amount: 1000000000,
          premium_rate: 0.25,
        },
      ];

      await this.prisma.insurance.createMany({
        data: insurances.map((i) => ({
          ...i,
          created_by: this.adminId,
          is_active: true,
          is_deleted: false,
        })),
      });

      this.logger.log('✅ Insurances seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed insurances: ${errorMessage}`);
    }
  }
}
