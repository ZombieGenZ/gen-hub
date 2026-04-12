import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationConfigService } from '../../common/config/pagination-config.service';
import { QueryGlobalNotificationDto } from './dto';
import { IGlobalNotification, IPaginatedResponse } from './interfaces';

/**
 * Repository xử lý database operations cho GlobalNotification
 */
@Injectable()
export class GlobalNotificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paginationConfig: PaginationConfigService,
  ) {}

  // Tạo mới GlobalNotification
  async create(
    data: Prisma.GlobalNotificationCreateInput,
  ): Promise<IGlobalNotification> {
    return this.prisma.globalNotification.create({ data });
  }

  // Tìm theo ID
  async findById(id: string): Promise<IGlobalNotification | null> {
    return this.prisma.globalNotification.findFirst({
      where: { id, is_deleted: false },
    });
  }

  // Lấy danh sách với phân trang
  async findMany(
    query: QueryGlobalNotificationDto,
  ): Promise<IPaginatedResponse<IGlobalNotification>> {
    const limit = this.paginationConfig.getLimit(query.limit);
    const offset = this.paginationConfig.getOffset(query.offset);

    const where: Prisma.GlobalNotificationWhereInput = {
      is_deleted: false,
    };

    if (query.keywords) {
      where.OR = [
        { title: { contains: query.keywords, mode: 'insensitive' } },
        { content: { contains: query.keywords, mode: 'insensitive' } },
      ];
    }

    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }

    if (query.type) {
      where.type = query.type;
    }

    const [items, total] = await Promise.all([
      this.prisma.globalNotification.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.globalNotification.count({ where }),
    ]);

    // Fetch creators
    const creatorIds = [
      ...new Set(items.map((item) => item.created_by).filter((id) => id)),
    ];
    const creators = await this.prisma.user.findMany({
      where: { id: { in: creatorIds as string[] } },
      select: { id: true, name: true, email: true },
    });

    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    const itemsWithCreator = items.map((item) => ({
      ...item,
      creator: item.created_by ? creatorMap.get(item.created_by) : null,
    }));

    return {
      items: itemsWithCreator as any, // Cast to any or intersection type
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  // Lấy danh sách active (cho public)
  async findActiveNotifications(): Promise<IGlobalNotification[]> {
    const now = new Date();
    return this.prisma.globalNotification.findMany({
      where: {
        is_deleted: false,
        is_active: true,
        OR: [{ starts_at: null }, { starts_at: { lte: now } }],
        AND: [
          {
            OR: [{ ends_at: null }, { ends_at: { gte: now } }],
          },
        ],
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Cập nhật GlobalNotification
  async update(
    id: string,
    data: Prisma.GlobalNotificationUpdateInput,
  ): Promise<IGlobalNotification> {
    return this.prisma.globalNotification.update({
      where: { id },
      data,
    });
  }

  // Xóa mềm GlobalNotification
  async softDelete(
    id: string,
    deletedBy: string,
  ): Promise<IGlobalNotification> {
    return this.prisma.globalNotification.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async findByIds(ids: string[]): Promise<IGlobalNotification[]> {
    return this.prisma.globalNotification.findMany({
      where: { id: { in: ids }, is_deleted: false },
    });
  }

  async softDeleteMany(ids: string[], deletedBy: string): Promise<void> {
    await this.prisma.globalNotification.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }
}
