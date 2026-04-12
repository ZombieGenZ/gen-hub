import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryRackTemplateDto } from './dto';

/**
 * Repository xử lý database operations cho RackTemplate
 */
@Injectable()
export class RackTemplateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationConfig: PaginationConfigService,
  ) {}

  /** Include relations cho rack */
  private readonly fullInclude = {
    shelves: {
      where: { is_deleted: false },
      orderBy: { created_at: 'asc' as const },
      include: {
        blocks: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' as const },
        },
      },
    },
  };

  /** Include nhẹ cho list */
  private readonly listInclude = {
    _count: {
      select: {
        shelves: { where: { is_deleted: false } },
      },
    },
  };

  async create(data: Prisma.RackTemplateCreateInput) {
    return this.prisma.rackTemplate.create({
      data,
      include: this.fullInclude,
    });
  }

  async findById(id: string) {
    return this.prisma.rackTemplate.findFirst({
      where: { id, is_deleted: false },
      include: this.fullInclude,
    });
  }

  async findByCode(rowTemplateId: string, code: string, excludeId?: string) {
    return this.prisma.rackTemplate.findFirst({
      where: {
        row_template_id: rowTemplateId,
        code,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async findMany(rowTemplateId: string, query: QueryRackTemplateDto) {
    const limit = this.paginationConfig.getLimit(query.limit);
    const offset = this.paginationConfig.getOffset(query.offset);
    const { keywords, is_active } = query;

    const where: Prisma.RackTemplateWhereInput = {
      row_template_id: rowTemplateId,
      is_deleted: false,
      ...(is_active !== undefined && { is_active }),
      ...(keywords && {
        OR: [
          { name: { contains: keywords, mode: 'insensitive' } },
          { code: { contains: keywords, mode: 'insensitive' } },
          { description: { contains: keywords, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.rackTemplate.findMany({
        where,
        include: this.listInclude,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.rackTemplate.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async update(id: string, data: Prisma.RackTemplateUpdateInput) {
    return this.prisma.rackTemplate.update({
      where: { id },
      data,
      include: this.fullInclude,
    });
  }

  async softDelete(id: string, deletedBy: string) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Cascade delete nested entities
      const shelves = await tx.shelfTemplate.findMany({
        where: { rack_template_id: id, is_deleted: false },
        select: { id: true },
      });
      const shelfIds = shelves.map((s) => s.id);

      if (shelfIds.length > 0) {
        await tx.blockTemplate.updateMany({
          where: { shelf_template_id: { in: shelfIds }, is_deleted: false },
          data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
        });

        await tx.shelfTemplate.updateMany({
          where: { rack_template_id: id, is_deleted: false },
          data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
        });
      }

      // Soft delete rack
      return tx.rackTemplate.update({
        where: { id },
        data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
      });
    });
  }

  async softDeleteMany(ids: string[], deletedBy: string) {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Cascade delete nested entities
      const shelves = await tx.shelfTemplate.findMany({
        where: { rack_template_id: { in: ids }, is_deleted: false },
        select: { id: true },
      });
      const shelfIds = shelves.map((s) => s.id);

      if (shelfIds.length > 0) {
        await tx.blockTemplate.updateMany({
          where: { shelf_template_id: { in: shelfIds }, is_deleted: false },
          data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
        });

        await tx.shelfTemplate.updateMany({
          where: { rack_template_id: { in: ids }, is_deleted: false },
          data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
        });
      }

      return tx.rackTemplate.updateMany({
        where: { id: { in: ids } },
        data: { is_deleted: true, deleted_at: now, deleted_by: deletedBy },
      });
    });
  }

  async findByIds(ids: string[]) {
    return this.prisma.rackTemplate.findMany({
      where: { id: { in: ids }, is_deleted: false },
    });
  }

  /** Kiểm tra row template tồn tại và trả về warehouse bounds */
  async rowTemplateExists(id: string) {
    const row = await this.prisma.rowTemplate.findFirst({
      where: { id, is_deleted: false },
      select: {
        id: true,
        warehouse_template_id: true,
        warehouse_template: {
          select: { length: true, width: true, created_by: true },
        },
      },
    });
    return row;
  }

  /** Lấy tất cả racks trong một row với position và dimensions để kiểm tra overlap */
  async findRacksInRow(rowTemplateId: string, excludeRackId?: string) {
    return this.prisma.rackTemplate.findMany({
      where: {
        row_template_id: rowTemplateId,
        is_deleted: false,
        ...(excludeRackId && { id: { not: excludeRackId } }),
      },
      select: {
        id: true,
        name: true,
        position_x: true,
        position_y: true,
        dimensions_width: true,
        dimensions_height: true,
      },
    });
  }
}
