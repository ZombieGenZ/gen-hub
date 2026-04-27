import { BaseSeeder } from '../base.seeder';

export class RedisPermissionsSeeder extends BaseSeeder {
  async seed() {
    const permissions = [
      {
        key: 'redis.manage',
        name: 'Quản lý Redis Cache',
        description: 'Quyền thêm, sửa, xóa các entry trong Redis cache',
      },
    ];

    for (const permission of permissions) {
      await this.prisma.permission.upsert({
        where: { key: permission.key },
        update: permission,
        create: permission,
      });
    }

    this.logger.log('✅ Redis permissions seeded');
  }
}
