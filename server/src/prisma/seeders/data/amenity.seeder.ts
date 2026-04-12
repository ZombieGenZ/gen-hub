import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

/**
 * Seeder cho dữ liệu Amenity (Tiện ích kho)
 */
export class AmenitySeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'AmenitySeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  async run(): Promise<void> {
    if (process.env.SEED_AMENITIES !== 'true') return;

    try {
      const existingCount = await this.prisma.amenity.count({
        where: { is_deleted: false },
      });

      if (existingCount > 0) return;

      const amenities = [
        {
          name: 'Camera an ninh 24/7',
          description: 'Hệ thống camera giám sát hoạt động suốt ngày đêm',
        },
        {
          name: 'Hệ thống báo cháy',
          description: 'Hệ thống cảnh báo và chữa cháy tự động',
        },
        {
          name: 'Điều hòa nhiệt độ',
          description: 'Kiểm soát nhiệt độ phù hợp cho hàng hóa',
        },
        {
          name: 'Bãi đậu xe',
          description: 'Bãi xe rộng rãi cho xe tải ra vào',
        },
        {
          name: 'Máy bốc xếp',
          description: 'Forklift và các thiết bị bốc xếp hàng hóa',
        },
        {
          name: 'Bảo vệ 24/7',
          description: 'Nhân viên bảo vệ túc trực suốt ngày đêm',
        },
        {
          name: 'Kho lạnh',
          description: 'Kho bảo quản hàng hóa ở nhiệt độ thấp',
        },
        { name: 'Wifi tốc độ cao', description: 'Kết nối internet tốc độ cao' },
      ];

      await this.prisma.amenity.createMany({
        data: amenities.map((a) => ({
          ...a,
          created_by: this.adminId,
          is_active: true,
          is_deleted: false,
        })),
      });

      this.logger.log('✅ Amenities seeded');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to seed amenities: ${errorMessage}`);
    }
  }
}
