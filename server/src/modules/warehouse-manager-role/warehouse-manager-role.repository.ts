import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  WarehouseManagerRole,
  WarehouseManagerPermission,
} from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';

@Injectable()
export class WarehouseManagerRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(
    data: Prisma.WarehouseManagerRoleCreateInput,
  ): Promise<WarehouseManagerRole> {
    return this.prisma.warehouseManagerRole.create({
      data,
    });
  }

  async findRoleById(id: string): Promise<WarehouseManagerRole | null> {
    return this.prisma.warehouseManagerRole.findUnique({
      where: { id, is_deleted: false },
    });
  }

  async findAllRoles(
    query: any,
  ): Promise<IPaginatedResponse<WarehouseManagerRole>> {
    const {
      page = 1,
      limit = 10,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WarehouseManagerRoleWhereInput = {
      is_deleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.warehouseManagerRole.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sort_by]: sort_order },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      }),
      this.prisma.warehouseManagerRole.count({ where }),
    ]);

    return {
      items: data,
      total,
      limit: Number(limit),
      offset: skip,
      hasMore: skip + Number(limit) < total,
    };
  }

  async updateRole(
    id: string,
    data: Prisma.WarehouseManagerRoleUpdateInput,
  ): Promise<WarehouseManagerRole> {
    return this.prisma.warehouseManagerRole.update({
      where: { id },
      data,
    });
  }

  async softDeleteRole(id: string, deletedBy: string): Promise<void> {
    await this.prisma.warehouseManagerRole.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findAllPermissions(): Promise<WarehouseManagerPermission[]> {
    return this.prisma.warehouseManagerPermission.findMany({
      where: { is_deleted: false },
    });
  }

  async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    // First remove existing permissions
    await this.prisma.warehouseManagerRolePermission.deleteMany({
      where: { role_id: roleId },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.prisma.warehouseManagerRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          role_id: roleId,
          permission_id: permissionId,
        })),
      });
    }
  }
}
