import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { phoneCodeDetailSelect, phoneCodeListSelect } from './selects';

@Injectable()
export class PhoneCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    code: string;
    flag_url?: string;
    is_active?: boolean;
    created_by: string;
  }) {
    return this.prisma.phoneCode.create({
      data: {
        ...data,
        is_active: data.is_active ?? true,
      },
      select: phoneCodeDetailSelect,
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }) {
    return this.prisma.phoneCode.findMany({
      ...params,
      select: phoneCodeListSelect,
    });
  }

  async count(where?: any) {
    return this.prisma.phoneCode.count({ where });
  }

  async findById(id: string, userId?: string, hasReadAllPermission?: boolean) {
    const where: any = { id, is_deleted: false };
    if (!hasReadAllPermission && userId) {
      where.created_by = userId;
    }
    return this.prisma.phoneCode.findFirst({
      where,
      select: phoneCodeDetailSelect,
    });
  }

  async findByName(name: string, excludeId?: string) {
    return this.prisma.phoneCode.findFirst({
      where: {
        name,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: phoneCodeDetailSelect,
    });
  }

  async findByCode(code: string, excludeId?: string) {
    return this.prisma.phoneCode.findFirst({
      where: {
        code,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: phoneCodeDetailSelect,
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      code?: string;
      flag_url?: string;
      is_active?: boolean;
      updated_by: string;
    },
  ) {
    return this.prisma.phoneCode.update({
      where: { id },
      data,
      select: phoneCodeDetailSelect,
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.phoneCode.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findByIds(
    ids: string[],
    userId?: string,
    hasDeleteAllPermission?: boolean,
  ) {
    const where: any = { id: { in: ids }, is_deleted: false };
    if (!hasDeleteAllPermission && userId) {
      where.created_by = userId;
    }

    return this.prisma.phoneCode.findMany({
      where,
      select: phoneCodeListSelect,
    });
  }

  async softDeleteMany(ids: string[], deletedBy: string) {
    return this.prisma.phoneCode.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }
}
