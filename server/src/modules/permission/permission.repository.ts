import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Permission, Prisma } from '@prisma/client';
import { IPermissionListResult } from './interfaces';
import { StatusFilter } from './dto';

interface FindManyParams {
  limit: number;
  offset: number;
  keywords?: string;
  status?: StatusFilter;
  module?: string;
}

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách permissions với phân trang
   */
  async findMany(params: FindManyParams): Promise<IPermissionListResult> {
    const { limit, offset, keywords, status, module } = params;

    const where: Prisma.PermissionWhereInput = {
      is_deleted: false,
    };

    // Lọc theo status
    if (status === StatusFilter.ACTIVE) {
      where.is_active = true;
    } else if (status === StatusFilter.INACTIVE) {
      where.is_active = false;
    }

    // Lọc theo module (prefix của key)
    if (module) {
      where.key = { startsWith: `${module}.` };
    }

    // Tìm kiếm theo keywords
    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { key: { contains: keywords, mode: 'insensitive' } },
        { description: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { key: 'asc' },
      }),
      this.prisma.permission.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Lấy tất cả permissions active
   */
  async findAllActive(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Lấy permission theo ID
   */
  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findFirst({
      where: {
        id,
        is_deleted: false,
      },
    });
  }

  /**
   * Lấy danh sách permission IDs được gán cho role
   */
  async getPermissionIdsByRoleId(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role_id: roleId,
        is_active: true,
        is_deleted: false,
      },
      select: { permission_id: true },
    });
    return rolePermissions.map((rp) => rp.permission_id);
  }

  /**
   * Lấy danh sách permission IDs được gán trực tiếp cho user
   */
  async getPermissionIdsByUserId(userId: string): Promise<string[]> {
    const userPermissions = await this.prisma.userPermission.findMany({
      where: {
        user_id: userId,
        is_active: true,
        is_deleted: false,
      },
      select: { permission_id: true },
    });
    return userPermissions.map((up) => up.permission_id);
  }

  /**
   * Lấy tất cả permission IDs của user (qua roles + trực tiếp)
   */
  async getAllPermissionIdsByUserId(userId: string): Promise<string[]> {
    // Run both queries in parallel for better performance
    const [directPermissions, userRoles] = await Promise.all([
      this.getPermissionIdsByUserId(userId),
      this.prisma.userRole.findMany({
        where: {
          user_id: userId,
          is_active: true,
          is_deleted: false,
          role: {
            is_active: true,
            is_deleted: false,
          },
        },
        select: {
          role: {
            select: {
              permissions: {
                where: {
                  is_active: true,
                  is_deleted: false,
                },
                select: { permission_id: true },
              },
            },
          },
        },
      }),
    ]);

    const rolePermissionIds = userRoles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission_id),
    );

    // Merge và loại bỏ trùng lặp
    return [...new Set([...directPermissions, ...rolePermissionIds])];
  }

  /**
   * Lấy danh sách permission IDs từ nhiều roles
   */
  async getPermissionIdsByRoleIds(roleIds: string[]): Promise<string[]> {
    if (!roleIds.length) return [];

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: {
        role_id: { in: roleIds },
        is_active: true,
        is_deleted: false,
        role: {
          is_active: true,
          is_deleted: false,
        },
      },
      select: { permission_id: true },
    });

    return [...new Set(rolePermissions.map((rp) => rp.permission_id))];
  }

  /**
   * Lấy danh sách modules (prefix) duy nhất từ permission keys
   */
  async getDistinctModules(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { is_deleted: false },
      select: { key: true },
    });

    const modules = new Set<string>();
    permissions.forEach((p) => {
      const prefix = p.key.split('.')[0];
      if (prefix) modules.add(prefix);
    });

    return Array.from(modules).sort();
  }
}
