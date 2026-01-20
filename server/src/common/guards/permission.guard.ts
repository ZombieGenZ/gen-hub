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
import { PERMISSIONS_ANY_KEY } from '../decorators/require-any-permission.decorator';
import { ResponseCode } from '../responses';

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

    const requiredAnyPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Nếu không có permission nào được yêu cầu, cho phép truy cập
    if ((!requiredPermissions || requiredPermissions.length === 0) &&
      (!requiredAnyPermissions || requiredAnyPermissions.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string } | undefined;

    if (!user?.userId) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN,
        message: 'Không có quyền truy cập',
        success: false,
      });
    }

    // Kiểm tra tài khoản đã được xác minh chưa
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { is_verified: true, is_banned: true },
    });

    if (!userRecord) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_FOUND,
        message: 'Tài khoản không tồn tại',
        success: false,
      });
    }

    if (userRecord.is_banned) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_BANNED,
        message: 'Tài khoản đã bị khóa',
        success: false,
      });
    }

    if (!userRecord.is_verified) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN_ACCOUNT_NOT_VERIFIED,
        message: 'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
        success: false,
      });
    }

    const userPermissions = await this.getUserPermissions(user.userId);

    // Kiểm tra RequirePermission (AND logic - phải có TẤT CẢ)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException({
          code: ResponseCode.ERROR_FORBIDDEN_NO_PERMISSION,
          message: 'Không có quyền thực hiện thao tác này',
          success: false,
        });
      }
    }

    // Kiểm tra RequireAnyPermission (OR logic - chỉ cần có MỘT)
    if (requiredAnyPermissions && requiredAnyPermissions.length > 0) {
      const hasAnyPermission = requiredAnyPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasAnyPermission) {
        throw new ForbiddenException({
          code: ResponseCode.ERROR_FORBIDDEN_NO_PERMISSION,
          message: 'Không có quyền thực hiện thao tác này',
          success: false,
        });
      }
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
