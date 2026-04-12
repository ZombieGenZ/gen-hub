import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryBlockTemplateDto } from './dto';

/**
 * Repository xử lý database operations cho BlockTemplate
 */
@Injectable()
export class BlockTemplateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationConfig: PaginationConfigService,
  ) {}

  async create(data: Prisma.BlockTemplateCreateInput) {
    return this.prisma.blockTemplate.create({ data });
  }

  async findById(id: string) {
    return this.prisma.blockTemplate.findFirst({
      where: { id, is_deleted: false },
    });
  }

  async findByCode(shelfTemplateId: string, code: string, excludeId?: string) {
    return this.prisma.blockTemplate.findFirst({
      where: {
        shelf_template_id: shelfTemplateId,
        code,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async findMany(shelfTemplateId: string, query: QueryBlockTemplateDto) {
    const limit = this.paginationConfig.getLimit(query.limit);
    const offset = this.paginationConfig.getOffset(query.offset);
    const { keywords, is_active } = query;

    const where: Prisma.BlockTemplateWhereInput = {
      shelf_template_id: shelfTemplateId,
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
      this.prisma.blockTemplate.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.blockTemplate.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async update(id: string, data: Prisma.BlockTemplateUpdateInput) {
    return this.prisma.blockTemplate.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string, deletedBy: string) {
    return this.prisma.blockTemplate.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async softDeleteMany(ids: string[], deletedBy: string) {
    return this.prisma.blockTemplate.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findByIds(ids: string[]) {
    return this.prisma.blockTemplate.findMany({
      where: { id: { in: ids }, is_deleted: false },
    });
  }

  /** Kiểm tra shelf template tồn tại và lấy parent info with warehouse bounds */
  async shelfTemplateExists(id: string) {
    const shelf = await this.prisma.shelfTemplate.findFirst({
      where: { id, is_deleted: false },
      select: {
        id: true,
        rack_template_id: true,
        rack_template: {
          select: {
            row_template_id: true,
            row_template: {
              select: {
                warehouse_template_id: true,
                warehouse_template: {
                  select: { length: true, width: true, created_by: true },
                },
              },
            },
          },
        },
      },
    });
    return shelf;
  }
}
