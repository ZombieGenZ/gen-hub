import { BaseSeeder } from '../base.seeder';
import { PrismaClient } from '@prisma/client';

export class AvatarCoverRankPermissionsSeeder extends BaseSeeder {
  constructor(prisma: PrismaClient) {
    super(prisma, 'AvatarCoverRankPermissionsSeeder');
  }

  async run(): Promise<void> {
    await this.seedModulePermissions('avatar-image', 'Avatar image');
    await this.seedModulePermissions('cover-image', 'Cover image');
    await this.seedModulePermissions('rank', 'Rank');
    await this.seedModulePermissions('phone-code', 'Phone code');
  }

  private async seedModulePermissions(moduleKey: string, moduleLabel: string) {
    try {
      const permissions = [
        { key: `${moduleKey}.create`, name: `Create ${moduleLabel}`, description: `Permission to create ${moduleLabel}` },
        { key: `${moduleKey}.list`, name: `List own ${moduleLabel}`, description: `Permission to list own ${moduleLabel}` },
        { key: `${moduleKey}.list.all`, name: `List all ${moduleLabel}`, description: `Permission to list all ${moduleLabel}` },
        { key: `${moduleKey}.read`, name: `Read own ${moduleLabel}`, description: `Permission to read own ${moduleLabel}` },
        { key: `${moduleKey}.read.all`, name: `Read all ${moduleLabel}`, description: `Permission to read all ${moduleLabel}` },
        { key: `${moduleKey}.update`, name: `Update own ${moduleLabel}`, description: `Permission to update own ${moduleLabel}` },
        { key: `${moduleKey}.update.all`, name: `Update all ${moduleLabel}`, description: `Permission to update all ${moduleLabel}` },
        { key: `${moduleKey}.delete`, name: `Delete own ${moduleLabel}`, description: `Permission to delete own ${moduleLabel}` },
        { key: `${moduleKey}.delete.all`, name: `Delete all ${moduleLabel}`, description: `Permission to delete all ${moduleLabel}` },
      ];

      for (const perm of permissions) {
        await this.createPermissionIfNotExists(perm.key, perm.name, perm.description);
      }

      const adminRoles = await this.getAdminRoles();
      const seededPerms = await this.prisma.permission.findMany({
        where: { key: { in: permissions.map((p) => p.key) }, is_deleted: false },
      });

      for (const role of adminRoles) {
        for (const permission of seededPerms) {
          await this.assignPermissionToRole(role.id, permission.id);
        }
      }

      this.logger.log(`${moduleLabel} permissions seeded`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to seed ${moduleLabel} permissions: ${errorMessage}`);
    }
  }
}
