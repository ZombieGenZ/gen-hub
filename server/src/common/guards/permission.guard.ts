import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string } | undefined;

    if (!user?.userId) {
      throw new ForbiddenException('Không có quyền truy cập');
    }

    const userPermissions = await this.getUserPermissions(user.userId);

    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Không có quyền thực hiện thao tác này');
    }

    return true;
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    // 1. Check Redis cache first
    const cachedPermissions =
      await this.redisService.getUserPermissionsCache(userId);
    if (cachedPermissions !== null) {
      return cachedPermissions;
    }

    // 2. If not in cache, query database
    const directPermissions = await this.prisma.userPermission.findMany({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
        permission: {
          is_active: true,
          is_deleted: false,
        },
      },
      include: {
        permission: true,
      },
    });

    const rolePermissions = await this.prisma.userRole.findMany({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
        role: {
          is_active: true,
          is_deleted: false,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              where: {
                is_active: true,
                is_deleted: false,
                permission: {
                  is_active: true,
                  is_deleted: false,
                },
              },
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissionKeys = new Set<string>();

    for (const dp of directPermissions) {
      permissionKeys.add(dp.permission.key);
    }

    for (const ur of rolePermissions) {
      for (const rp of ur.role.permissions) {
        permissionKeys.add(rp.permission.key);
      }
    }

    const permissions = Array.from(permissionKeys);

    // 3. Cache the result for future requests
    await this.redisService.setUserPermissionsCache(userId, permissions);

    return permissions;
  }
}
