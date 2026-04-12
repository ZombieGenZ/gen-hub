import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, WarehouseTemplateManager } from '@prisma/client';
import { IPaginatedResponse } from '../../common/interfaces/pagination.interface';

@Injectable()
export class WarehouseManagerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createManager(
    data:
      | Prisma.WarehouseTemplateManagerCreateInput
      | Prisma.WarehouseTemplateManagerUncheckedCreateInput,
  ): Promise<WarehouseTemplateManager> {
    return this.prisma.warehouseTemplateManager.create({
      data,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findManagerById(id: string): Promise<WarehouseTemplateManager | null> {
    return this.prisma.warehouseTemplateManager.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        warehouse_template: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findManagerByTemplateAndUser(
    warehouseTemplateId: string,
    userId: string,
  ): Promise<WarehouseTemplateManager | null> {
    return this.prisma.warehouseTemplateManager.findUnique({
      where: {
        warehouse_template_id_user_id: {
          warehouse_template_id: warehouseTemplateId,
          user_id: userId,
        },
      },
    });
  }

  async findAllManagers(
    query: any,
  ): Promise<IPaginatedResponse<WarehouseTemplateManager>> {
    const {
      page = 1,
      limit = 10,
      warehouse_template_id,
      search,
      sort_by = 'created_at',
      sort_order = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.WarehouseTemplateManagerWhereInput = {
      is_deleted: false,
      ...(warehouse_template_id && { warehouse_template_id }),
      ...(search && {
        OR: [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { notes: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.warehouseTemplateManager.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sort_by]: sort_order },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          warehouse_template: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.warehouseTemplateManager.count({ where }),
    ]);

    return {
      items,
      total,
      limit: Number(limit),
      offset: skip,
      hasMore: skip + Number(limit) < total,
    };
  }

  async updateManager(
    id: string,
    data: Prisma.WarehouseTemplateManagerUpdateInput,
  ): Promise<WarehouseTemplateManager> {
    return this.prisma.warehouseTemplateManager.update({
      where: { id },
      data,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async softDeleteManager(id: string, deletedBy: string): Promise<void> {
    await this.prisma.warehouseTemplateManager.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
        is_active: false,
      },
    });
  }

  async assignRolesToManager(
    managerId: string,
    roleIds: string[],
  ): Promise<void> {
    // First remove existing roles
    await this.prisma.warehouseTemplateManagerRole.deleteMany({
      where: { manager_id: managerId },
    });

    // Add new roles
    if (roleIds.length > 0) {
      await this.prisma.warehouseTemplateManagerRole.createMany({
        data: roleIds.map((roleId) => ({
          manager_id: managerId,
          role_id: roleId,
          is_active: true,
        })),
      });
    }
  }
}
