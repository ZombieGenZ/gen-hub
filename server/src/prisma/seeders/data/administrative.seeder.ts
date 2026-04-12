import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

interface VietMapProvince {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
}

interface VietMapWard {
  code: string;
  name: string;
  slug: string;
  type: string;
  name_with_type: string;
  parent_code: string;
}

/**
 * Seeder cho Vietnam Administrative Data (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã)
 */
export class AdministrativeSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'AdministrativeSeeder');
  }

  async run(): Promise<void> {
    try {
      const existingProvinces = await this.prisma.province.count();
      if (existingProvinces > 0) {
        return;
      }

      this.logger.log('🌱 Seeding Vietnam administrative...');

      const provincesUrl =
        'https://raw.githubusercontent.com/vietmap-company/vietnam_administrative_address/main/admin_new/province.json';
      const wardsUrl =
        'https://raw.githubusercontent.com/vietmap-company/vietnam_administrative_address/main/admin_new/ward.json';

      const [provincesResponse, wardsResponse] = await Promise.all([
        fetch(provincesUrl),
        fetch(wardsUrl),
      ]);

      if (!provincesResponse.ok) {
        throw new Error(`Provinces API failed: ${provincesResponse.status}`);
      }
      if (!wardsResponse.ok) {
        throw new Error(`Wards API failed: ${wardsResponse.status}`);
      }

      const provincesData = (await provincesResponse.json()) as Record<
        string,
        VietMapProvince
      >;
      const wardsData = (await wardsResponse.json()) as Record<
        string,
        VietMapWard
      >;

      const provinces = Object.values(provincesData);
      const wards = Object.values(wardsData);

      const wardsByProvince = new Map<string, VietMapWard[]>();
      for (const ward of wards) {
        const provinceCode = ward.parent_code;
        if (!wardsByProvince.has(provinceCode)) {
          wardsByProvince.set(provinceCode, []);
        }
        wardsByProvince.get(provinceCode)!.push(ward);
      }

      for (const province of provinces) {
        const provinceWards = wardsByProvince.get(province.code) || [];

        await this.prisma.province.create({
          data: {
            code: province.code,
            name: province.name,
            slug: province.slug,
            type: this.mapProvinceType(province.type),
            wards: {
              create: provinceWards.map((ward) => ({
                code: ward.code,
                name: ward.name,
                slug: ward.slug,
                type: this.mapWardType(ward.type),
              })),
            },
          },
        });
      }

      this.logger.log(
        `✅ Seeded ${provinces.length} provinces, ${wards.length} wards`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Failed to seed Vietnam administrative: ${errorMessage}`,
      );
    }
  }

  private mapProvinceType(type: string): 'PROVINCE' | 'CITY' {
    const typeMap: Record<string, 'PROVINCE' | 'CITY'> = {
      'thành phố trung ương': 'CITY',
      'thành phố': 'CITY',
      tỉnh: 'PROVINCE',
    };
    return typeMap[type.toLowerCase()] || 'PROVINCE';
  }

  private mapWardType(
    type: string,
  ): 'WARD' | 'COMMUNE' | 'TOWNSHIP' | 'TOWN' | 'CITY' {
    const typeMap: Record<
      string,
      'WARD' | 'COMMUNE' | 'TOWNSHIP' | 'TOWN' | 'CITY'
    > = {
      phường: 'WARD',
      xã: 'COMMUNE',
      'thị trấn': 'TOWNSHIP',
      'thị xã': 'TOWN',
      quận: 'CITY',
      huyện: 'COMMUNE',
      'thành phố': 'CITY',
    };
    return typeMap[type.toLowerCase()] || 'WARD';
  }
}
