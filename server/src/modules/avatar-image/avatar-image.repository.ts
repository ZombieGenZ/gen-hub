import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { avatarImageDetailSelect, avatarImageListSelect } from './selects';

@Injectable()
export class AvatarImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    image_url: string;
    is_default?: boolean;
    is_active?: boolean;
    created_by: string;
  }) {
    return this.prisma.avatarImage.create({
      data: {
        ...data,
        is_default: data.is_default ?? false,
        is_active: data.is_active ?? true,
      },
      select: avatarImageDetailSelect,
    });
  }

  async findAll(params: { skip?: number; take?: number; where?: any; orderBy?: any }) {
    return this.prisma.avatarImage.findMany({
      ...params,
      select: avatarImageListSelect,
    });
  }

  async count(where?: any) {
    return this.prisma.avatarImage.count({ where });
  }

  async findById(id: string, userId?: string, hasReadAllPermission?: boolean) {
    const where: any = { id, is_deleted: false };
    if (!hasReadAllPermission && userId) {
      where.created_by = userId;
    }
    return this.prisma.avatarImage.findFirst({ where, select: avatarImageDetailSelect });
  }

  async findByName(name: string, excludeId?: string) {
    return this.prisma.avatarImage.findFirst({
      where: {
        name,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: avatarImageDetailSelect,
    });
  }

  async findCurrentDefault(excludeId?: string) {
    return this.prisma.avatarImage.findFirst({
      where: {
        is_deleted: false,
        is_default: true,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
  }

  async setDefault(id: string, value: boolean) {
    return this.prisma.avatarImage.update({
      where: { id },
      data: { is_default: value },
      select: { id: true, is_default: true },
    });
  }

  async update(id: string, data: {
    name?: string;
    description?: string;
    image_url?: string;
    is_default?: boolean;
    is_active?: boolean;
    updated_by: string;
  }) {
    return this.prisma.avatarImage.update({
      where: { id },
      data,
      select: avatarImageDetailSelect,
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.avatarImage.update({
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

    return this.prisma.avatarImage.findMany({ where, select: avatarImageListSelect });
  }

  async softDeleteMany(ids: string[], deletedBy: string) {
    return this.prisma.avatarImage.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }
}
