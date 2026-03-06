import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

export class PhoneCodeSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'PhoneCodeSeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  async run(): Promise<void> {
    if (process.env.SEED_PHONE_CODES !== 'true') return;

    try {
      const existingCount = await this.prisma.phoneCode.count({
        where: { is_deleted: false },
      });

      if (existingCount > 0) return;

      await this.prisma.phoneCode.createMany({
        data: [
          { name: 'Viet Nam', code: '+84', description: 'Vietnam country code', is_active: true, is_deleted: false, created_by: this.adminId },
          { name: 'United States', code: '+1', description: 'US country code', is_active: true, is_deleted: false, created_by: this.adminId },
          { name: 'United Kingdom', code: '+44', description: 'UK country code', is_active: true, is_deleted: false, created_by: this.adminId },
          { name: 'Japan', code: '+81', description: 'Japan country code', is_active: true, is_deleted: false, created_by: this.adminId },
          { name: 'South Korea', code: '+82', description: 'South Korea country code', is_active: true, is_deleted: false, created_by: this.adminId },
          { name: 'China', code: '+86', description: 'China country code', is_active: true, is_deleted: false, created_by: this.adminId },
        ],
      });

      this.logger.log('Phone codes seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed phone codes: ${errorMessage}`);
    }
  }
}
