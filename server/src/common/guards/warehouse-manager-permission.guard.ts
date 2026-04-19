import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { WM_PERMISSION_KEY } from '../decorators/require-wm-permission.decorator';
import { ResponseCode } from '../responses';

@Injectable()
export class WarehouseManagerPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string } | undefined;
    const templateId = request.params?.templateId as string | undefined;
    const requiredPermission = this.reflector.getAllAndOverride<string>(
      WM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!user?.userId) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN,
        message: 'Không có quyền truy cập',
        success: false,
      });
    }

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
        message:
          'Tài khoản chưa được xác minh. Vui lòng xác minh email để tiếp tục.',
        success: false,
      });
    }

    const warehouseIds = await this.getManagedWarehouseIds(
      user.userId,
      templateId,
    );
    request.warehouseIds = warehouseIds;

    // Inventory APIs của warehouse manager không truyền templateId.
    // Chúng chỉ cần scope warehouseIds để service lọc đúng phiếu.
    if (!requiredPermission) {
      return true;
    }

    if (!templateId) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN,
        message: 'Thiếu thông tin kho mẫu',
        success: false,
      });
    }

    const hasPermission = await this.checkManagerPermission(
      user.userId,
      templateId,
      requiredPermission,
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        code: ResponseCode.ERROR_FORBIDDEN_NO_PERMISSION,
        message:
          'Bạn không phải quản lý của kho mẫu này hoặc không có quyền thực hiện thao tác này',
        success: false,
      });
    }

    request.warehouseManager = { templateId, warehouseIds };
    return true;
  }

  private async getManagedWarehouseIds(
    userId: string,
    templateId?: string,
  ): Promise<string[]> {
    const cacheKey = `wm:warehouses:${userId}:${templateId || 'all'}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }

    // 1. Check for System Admin
    const systemRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId, is_active: true, is_deleted: false },
      include: { role: true },
    });
    const isSystemAdmin = systemRoles.some((ur) => {
      const roleName = ur.role?.name?.toLowerCase().replace(/\s+/g, '') || '';
      return [
        'sysadmin',
        'admin',
        'superadmin',
        'administrator',
        'systemadministrator',
        'quantrivien',
      ].includes(roleName);
    });

    if (isSystemAdmin) {
      const allWarehouses = await this.prisma.warehouse.findMany({
        where: { is_active: true, is_deleted: false },
        select: { id: true },
      });
      const warehouseIds = allWarehouses.map((w) => w.id);
      await this.redisService.set(cacheKey, JSON.stringify(warehouseIds), 300);
      return warehouseIds;
    }

    // 2. Locate Organization scopes for Org Owners / Org Admins
    const ownedOrgs = await this.prisma.organization.findMany({
      where: { owner_id: userId, is_active: true, is_deleted: false },
      select: { id: true },
    });

    const adminRoles = await this.prisma.organizationMemberRole.findMany({
      where: {
        member: { user_id: userId, is_active: true, is_deleted: false },
        role: {
          name: { in: ['admin', 'owner', 'manager'] },
          is_active: true,
          is_deleted: false,
        },
        is_active: true,
        is_deleted: false,
      },
      select: { member: { select: { organization_id: true } } },
    });

    const orgIdsWithFullAccess = new Set([
      ...ownedOrgs.map((o) => o.id),
      ...adminRoles.map((a) => a.member.organization_id),
    ]);

    // 3. Locate Explicit Warehouse Manager assignments
    const managers = await this.prisma.warehouseTemplateManager.findMany({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
        ...(templateId ? { warehouse_template_id: templateId } : {}),
      },
      select: { warehouse_template_id: true },
    });

    if (managers.length === 0 && orgIdsWithFullAccess.size === 0) {
      await this.redisService.set(cacheKey, JSON.stringify([]), 300);
      return [];
    }

    const warehouseTemplateIds = managers.map(
      (manager) => manager.warehouse_template_id,
    );

    const warehouses = await this.prisma.warehouse.findMany({
      where: {
        OR: [
          { warehouse_template_id: { in: warehouseTemplateIds } },
          { organization_id: { in: Array.from(orgIdsWithFullAccess) } },
        ],
        is_active: true,
        is_deleted: false,
      },
      select: { id: true },
    });

    const warehouseIds = warehouses.map((warehouse) => warehouse.id);
    await this.redisService.set(cacheKey, JSON.stringify(warehouseIds), 300);
    return warehouseIds;
  }

  private async checkManagerPermission(
    userId: string,
    templateId: string,
    requiredPermission: string,
  ): Promise<boolean> {
    const cacheKey = `wm:perm:${userId}:${templateId}:${requiredPermission}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    const manager = await this.prisma.warehouseTemplateManager.findUnique({
      where: {
        warehouse_template_id_user_id: {
          warehouse_template_id: templateId,
          user_id: userId,
        },
      },
      include: {
        roles: {
          where: { is_active: true },
          include: {
            role: {
              include: {
                permissions: {
                  where: { is_active: true },
                  include: {
                    permission: {
                      select: { key: true, is_active: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!manager || manager.is_deleted || !manager.is_active) {
      await this.redisService.set(cacheKey, 'false', 300);
      return false;
    }

    const hasPermission = manager.roles.some((managerRole) =>
      managerRole.role?.permissions.some(
        (rolePermission) =>
          rolePermission.permission.is_active &&
          rolePermission.permission.key === requiredPermission,
      ),
    );

    await this.redisService.set(
      cacheKey,
      hasPermission ? 'true' : 'false',
      300,
    );
    return hasPermission;
  }
}
