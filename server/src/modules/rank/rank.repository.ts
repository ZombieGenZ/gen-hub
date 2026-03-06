import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { rankDetailSelect, rankListSelect } from './selects';

@Injectable()
export class RankRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    is_default?: boolean;
    min_loyalty_points?: number;
    is_active?: boolean;
    created_by: string;
  }) {
    return this.prisma.rank.create({
      data: {
        ...data,
        is_default: data.is_default ?? false,
        min_loyalty_points: data.min_loyalty_points ?? 0,
        is_active: data.is_active ?? true,
      },
      select: rankDetailSelect,
    });
  }

  async findAll(params: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    return this.prisma.rank.findMany({
      ...params,
      select: rankListSelect,
    });
  }

  async count(where?: any) {
    return this.prisma.rank.count({ where });
  }

  async findById(id: string, userId?: string, hasReadAllPermission?: boolean) {
    const where: any = { id, is_deleted: false };
    if (!hasReadAllPermission && userId) {
      where.created_by = userId;
    }
    return this.prisma.rank.findFirst({ where, select: rankDetailSelect });
  }

  async findByName(name: string, excludeId?: string) {
    return this.prisma.rank.findFirst({
      where: {
        name,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: rankDetailSelect,
    });
  }

  async findCurrentDefault(excludeId?: string) {
    return this.prisma.rank.findFirst({
      where: {
        is_deleted: false,
        is_default: true,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
  }

  async setDefault(id: string, value: boolean) {
    return this.prisma.rank.update({
      where: { id },
      data: { is_default: value },
      select: { id: true, is_default: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    is_default?: boolean;
    min_loyalty_points?: number;
    is_active?: boolean;
    updated_by: string;
  }) {
    return this.prisma.rank.update({
      where: { id },
      data,
      select: rankDetailSelect,
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.rank.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findByIds(ids: string[], userId?: string, hasDeleteAllPermission?: boolean) {
    const where: any = { id: { in: ids }, is_deleted: false };
    if (!hasDeleteAllPermission && userId) {
      where.created_by = userId;
    }

    return this.prisma.rank.findMany({ where, select: rankListSelect });
  }

  async softDeleteMany(ids: string[], deletedBy: string) {
    return this.prisma.rank.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }
}
