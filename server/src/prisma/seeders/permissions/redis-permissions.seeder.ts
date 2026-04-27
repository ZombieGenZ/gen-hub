import { BaseSeeder } from '../base.seeder';

export class RedisPermissionsSeeder extends BaseSeeder {
  constructor(prisma: any) {
    super(prisma, 'RedisPermissionsSeeder');
  }

  async run(): Promise<void> {
    const permissions = [
      {
        key: 'redis.manage',
        name: 'Quản lý Redis Cache',
        description: 'Quyền thêm, sửa, xóa các entry trong Redis cache',
      },
    ];

    for (const permission of permissions) {
      const permissionId = await this.createPermissionIfNotExists(
        permission.key,
        permission.name,
        permission.description,
      );

      if (permissionId) {
        const adminRoles = await this.getAdminRoles();
        for (const role of adminRoles) {
          await this.assignPermissionToRole(role.id, permissionId);
        }
      }
    }

    this.logger.log('✅ Redis permissions seeded');
  }
}
