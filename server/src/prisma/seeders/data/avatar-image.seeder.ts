import { PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import * as path from 'path';

import { BaseSeeder } from '../base.seeder';

const AVATAR_SAMPLES = [
  {
    name: 'Avatar Mặc Định 01',
    description: 'Ảnh đại diện mẫu phong cách minh họa hiện đại',
    image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-avatar-01',
  },
  {
    name: 'Avatar Mặc Định 02',
    description: 'Ảnh đại diện mẫu cho người dùng doanh nghiệp',
    image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-avatar-02',
  },
  {
    name: 'Avatar Mặc Định 03',
    description: 'Ảnh đại diện mẫu phong cách tối giản',
    image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-avatar-03',
  },
  {
    name: 'Avatar Mặc Định 04',
    description: 'Ảnh đại diện mẫu cho khách hàng cá nhân',
    image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-avatar-04',
  },
  {
    name: 'Avatar Mặc Định 05',
    description: 'Ảnh đại diện mẫu tông màu trung tính',
    image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-avatar-05',
  },
  {
    name: 'Avatar Mặc Định 06',
    description: 'Ảnh đại diện mẫu phù hợp hồ sơ nhân viên',
    image_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-avatar-06',
  },
];

export class AvatarImageSeeder extends BaseSeeder {
  private adminId: string | null = null;

  constructor(prisma: PrismaClient) {
    super(prisma, 'AvatarImageSeeder');
  }

  setAdminId(adminId: string) {
    this.adminId = adminId;
  }

  private async updateConfigDefault(id: string) {
    const configPath = path.resolve(process.cwd(), 'app-config.json');
    if (!existsSync(configPath)) return;

    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    if (config.defaultAvatarId) return;

    config.defaultAvatarId = id;
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private async seedDefaultAvatar() {
    if (process.env.SEED_DEFAULT_AVATAR !== 'true') return;

    const existingDefault = await this.prisma.avatarImage.findFirst({
      where: { is_deleted: false, is_default: true },
    });

    if (existingDefault) {
      await this.updateConfigDefault(existingDefault.id);
      return;
    }

    const created = await this.prisma.avatarImage.create({
      data: {
        name: process.env.SEED_DEFAULT_AVATAR_NAME || 'Default Avatar',
        description: process.env.SEED_DEFAULT_AVATAR_DESCRIPTION || 'Default avatar image',
        image_url:
          process.env.SEED_DEFAULT_AVATAR_IMAGE_URL ||
          'https://api.dicebear.com/7.x/avataaars/svg?seed=genhub-default-avatar',
        is_default: true,
        is_active: true,
        is_deleted: false,
        created_by: this.adminId,
      },
    });

    await this.updateConfigDefault(created.id);
    this.logger.log('Avatar image default seeded');
  }

  private async seedMultipleAvatars() {
    if (process.env.SEED_AVATAR_IMAGES !== 'true') return;

    const existingCount = await this.prisma.avatarImage.count({
      where: { is_deleted: false, is_default: false },
    });

    if (existingCount > 0) return;

    await this.prisma.avatarImage.createMany({
      data: AVATAR_SAMPLES.map((avatar) => ({
        ...avatar,
        is_default: false,
        is_active: true,
        is_deleted: false,
        created_by: this.adminId,
      })),
    });

    this.logger.log('Additional avatar images seeded');
  }

  async run(): Promise<void> {
    if (
      process.env.SEED_DEFAULT_AVATAR !== 'true' &&
      process.env.SEED_AVATAR_IMAGES !== 'true'
    ) {
      return;
    }

    try {
      await this.seedDefaultAvatar();
      await this.seedMultipleAvatars();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed avatar images: ${errorMessage}`);
    }
  }
}
