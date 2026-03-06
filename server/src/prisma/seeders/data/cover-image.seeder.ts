import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';

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

  async run(): Promise<void> {
    if (process.env.SEED_DEFAULT_COVER !== 'true') return;

    try {
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
          description: process.env.SEED_DEFAULT_COVER_DESCRIPTION || 'Default cover image',
          image_url: process.env.SEED_DEFAULT_COVER_IMAGE_URL || 'https://example.com/default-cover.png',
          is_default: true,
          is_active: true,
          is_deleted: false,
          created_by: this.adminId,
        },
      });

      await this.updateConfigDefault(created.id);
      this.logger.log('Cover image default seeded');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed default cover image: ${errorMessage}`);
    }
  }
}
