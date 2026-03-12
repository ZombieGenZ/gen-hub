import { PrismaClient } from '@prisma/client';

import { BaseSeeder } from '../base.seeder';

interface RestCountry {
  name: {
    common: string;
    official: string;
  };
  idd: {
    root: string;
    suffixes: string[];
  };
}

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

      this.logger.log('Fetching phone codes from restcountries.com API...');

      const response = await fetch(
        'https://restcountries.com/v3.1/all?fields=name,idd',
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch countries: ${response.status} ${response.statusText}`,
        );
      }

      const countries: RestCountry[] = await response.json();

      // Dùng Map để deduplicate theo phone code (vd: US và Canada đều có +1)
      const phoneCodeMap = new Map<
        string,
        { name: string; code: string; description: string }
      >();

      for (const country of countries) {
        const { name, idd } = country;

        // Bỏ qua quốc gia không có idd root
        if (!idd?.root || idd.root === '') continue;

        // Bỏ qua quốc gia không có suffixes
        if (!idd.suffixes || idd.suffixes.length === 0) continue;

        // Lấy suffix đầu tiên để tạo mã điện thoại chính
        // Ví dụ: root = "+6", suffixes = ["5"] => code = "+65"
        const firstSuffix = idd.suffixes[0];

        // Bỏ qua suffix quá dài (đây là sub-code của 1 quốc gia lớn như US)
        const fullCode = `${idd.root}${firstSuffix}`;
        if (fullCode.length > 5) continue;

        // Nếu code đã tồn tại, ưu tiên giữ lại bản ghi đầu tiên
        if (!phoneCodeMap.has(fullCode)) {
          phoneCodeMap.set(fullCode, {
            name: name.common,
            code: fullCode,
            description: `Country phone code for ${name.official}`,
          });
        }
      }

      const phoneCodesData = Array.from(phoneCodeMap.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          name: item.name,
          code: item.code,
          description: item.description,
          is_active: true,
          is_deleted: false,
          created_by: this.adminId,
        }));

      this.logger.log(
        `Seeding ${phoneCodesData.length} phone codes from API...`,
      );

      await this.prisma.phoneCode.createMany({
        data: phoneCodesData,
        skipDuplicates: true,
      });

      this.logger.log(
        `Successfully seeded ${phoneCodesData.length} phone codes`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed phone codes: ${errorMessage}`);
    }
  }
}
