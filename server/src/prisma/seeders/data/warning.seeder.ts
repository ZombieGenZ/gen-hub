import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Warning (Warning Categories và Warn Penalties)
 */
export class WarningSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'WarningSeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  async run(): Promise<void> {
    await this.seedWarningCategories();
    await this.seedWarnPenalties();
  }

  private async seedWarningCategories() {
    if (process.env.SEED_WARNING_CATEGORIES !== 'true') return;

    try {
      const existingCount = await this.prisma.warningCategory.count({
        where: { is_deleted: false },
      });

      if (existingCount > 0) return;

      const categories = [
        {
          name: 'Vi phạm điều khoản sử dụng',
          description: 'User vi phạm các điều khoản sử dụng dịch vụ',
          severity: 3,
        },
        {
          name: 'Spam/Quấy rối',
          description: 'Hành vi spam hoặc quấy rối người dùng khác',
          severity: 2,
        },
        {
          name: 'Thông tin giả mạo',
          description: 'Cung cấp thông tin giả mạo, sai sự thật',
          severity: 4,
        },
        {
          name: 'Thanh toán gian lận',
          description: 'Các hành vi gian lận trong thanh toán',
          severity: 5,
        },
        {
          name: 'Hành vi không đúng mực',
          description: 'Hành vi thiếu tôn trọng, không phù hợp',
          severity: 2,
        },
      ];

      await this.prisma.warningCategory.createMany({
        data: categories.map((cat) => ({
          ...cat,
          created_by: this.adminId,
          is_active: true,
          is_deleted: false,
        })),
      });

      this.logger.log('✅ Warning categories seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed warning categories: ${errorMessage}`,
      );
    }
  }

  private async seedWarnPenalties() {
    if (process.env.SEED_WARN_PENALTIES !== 'true') return;

    try {
      const existingCount = await this.prisma.warnPenalty.count({
        where: { is_deleted: false },
      });

      if (existingCount > 0) return;

      const penalties = [
        {
          min_warn_count: 3,
          max_warn_count: 3,
          is_permanent_ban: false,
          duration_value: 24,
          duration_unit: 'HOUR' as const,
          description: 'Ban 24 giờ sau 3 lần warn',
        },
        {
          min_warn_count: 4,
          max_warn_count: 5,
          is_permanent_ban: false,
          duration_value: 3,
          duration_unit: 'DAY' as const,
          description: 'Ban 3 ngày sau 4-5 lần warn',
        },
        {
          min_warn_count: 6,
          max_warn_count: 9,
          is_permanent_ban: false,
          duration_value: 1,
          duration_unit: 'WEEK' as const,
          description: 'Ban 1 tuần sau 6-9 lần warn',
        },
        {
          min_warn_count: 10,
          max_warn_count: null,
          is_permanent_ban: true,
          duration_value: null,
          duration_unit: null,
          description: 'Ban vĩnh viễn sau 10+ lần warn',
        },
      ];

      for (const penalty of penalties) {
        await this.prisma.warnPenalty.create({
          data: {
            min_warn_count: penalty.min_warn_count,
            max_warn_count: penalty.max_warn_count,
            is_permanent_ban: penalty.is_permanent_ban,
            duration_value: penalty.duration_value,
            duration_unit: penalty.duration_unit,
            description: penalty.description,
            created_by: this.adminId,
            is_active: true,
            is_deleted: false,
          },
        });
      }

      this.logger.log('✅ Warn penalties seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed warn penalties: ${errorMessage}`);
    }
  }
}
