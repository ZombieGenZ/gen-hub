import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';

import { BaseSeeder } from '../base.seeder';

const COVER_SAMPLES = [
  {
    name: 'Cover Kho Bãi 01',
    description: 'Ảnh cover mẫu cho kho logistics hiện đại',
    image_url: 'https://picsum.photos/seed/genhub-cover-01/1600/900',
  },
  {
    name: 'Cover Kho Bãi 02',
    description: 'Ảnh cover mẫu cho kho lạnh và bảo quản',
    image_url: 'https://picsum.photos/seed/genhub-cover-02/1600/900',
  },
  {
    name: 'Cover Kho Bãi 03',
    description: 'Ảnh cover mẫu cho trung tâm phân phối',
    image_url: 'https://picsum.photos/seed/genhub-cover-03/1600/900',
  },
  {
    name: 'Cover Kho Bãi 04',
    description: 'Ảnh cover mẫu cho kho quy mô lớn',
    image_url: 'https://picsum.photos/seed/genhub-cover-04/1600/900',
  },
  {
    name: 'Cover Kho Bãi 05',
    description: 'Ảnh cover mẫu cho kho gần khu công nghiệp',
    image_url: 'https://picsum.photos/seed/genhub-cover-05/1600/900',
  },
  {
    name: 'Cover Kho Bãi 06',
    description: 'Ảnh cover mẫu cho kho chia sẻ linh hoạt',
    image_url: 'https://picsum.photos/seed/genhub-cover-06/1600/900',
  },
];

export class CoverImageSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'CoverImageSeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  private async updateConfigDefault(id: string) {
    const configPath = path.resolve(process.cwd(), 'app-config.json');
    if (!existsSync(configPath)) return;

    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    if (config.defaultCoverId) return;

    config.defaultCoverId = id;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private async seedDefaultCover() {
    if (process.env.SEED_DEFAULT_COVER !== 'true') return;

    const existingDefault = await this.prisma.coverImage.findFirst({
      where: { is_deleted: false, is_default: true },
    });

    if (existingDefault) {
      await this.updateConfigDefault(existingDefault.id);
      return;
    }

    const created = await this.prisma.coverImage.create({
      data: {
        name: process.env.SEED_DEFAULT_COVER_NAME || 'Default Cover',
        description:
          process.env.SEED_DEFAULT_COVER_DESCRIPTION || 'Default cover image',
        image_url:
          process.env.SEED_DEFAULT_COVER_IMAGE_URL ||
          'https://picsum.photos/seed/genhub-default-cover/1600/900',
        is_default: true,
        is_active: true,
        is_deleted: false,
        created_by: this.adminId,
      },
    });

    await this.updateConfigDefault(created.id);
    this.logger.log('Cover image default seeded');
  }

  private async seedMultipleCovers() {
    if (process.env.SEED_COVER_IMAGES !== 'true') return;

    const existingCount = await this.prisma.coverImage.count({
      where: { is_deleted: false, is_default: false },
    });

    if (existingCount > 0) return;

    await this.prisma.coverImage.createMany({
      data: COVER_SAMPLES.map((cover) => ({
        ...cover,
        is_default: false,
        is_active: true,
        is_deleted: false,
        created_by: this.adminId,
      })),
    });

    this.logger.log('Additional cover images seeded');
  }

  async run(): Promise<void> {
    if (
      process.env.SEED_DEFAULT_COVER !== 'true' &&
      process.env.SEED_COVER_IMAGES !== 'true'
    ) {
      return;
    }

    try {
      await this.seedDefaultCover();
      await this.seedMultipleCovers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed cover images: ${errorMessage}`);
    }
  }
}
