import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WarnPenalty, Prisma, BanDurationUnit } from '@prisma/client';
import { IWarnPenaltyListResult } from './interfaces';
import { StatusFilter } from './dto';

interface FindManyParams {
  limit: number;
  offset: number;
  keywords?: string;
  status?: StatusFilter;
}

interface CreateParams {
  min_warn_count: number;
  max_warn_count?: number;
  is_permanent_ban: boolean;
  duration_value?: number;
  duration_unit?: BanDurationUnit;
  description?: string;
  created_by: string;
}

interface UpdateParams {
  min_warn_count?: number;
  max_warn_count?: number;
  is_permanent_ban?: boolean;
  duration_value?: number;
  duration_unit?: BanDurationUnit;
  description?: string;
  is_active?: boolean;
  updated_by: string;
}

@Injectable()
export class WarnPenaltyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo warn penalty mới
   */
  async create(data: CreateParams): Promise<WarnPenalty> {
    return this.prisma.warnPenalty.create({
      data: {
        min_warn_count: data.min_warn_count,
        max_warn_count: data.max_warn_count,
        is_permanent_ban: data.is_permanent_ban,
        duration_value: data.duration_value,
        duration_unit: data.duration_unit,
        description: data.description,
        created_by: data.created_by,
      },
    });
  }

  /**
   * Lấy danh sách với phân trang
   */
  async findMany(params: FindManyParams): Promise<IWarnPenaltyListResult> {
    const { limit, offset, keywords, status } = params;

    const where: Prisma.WarnPenaltyWhereInput = {
      is_deleted: false,
    };

    // Lọc theo status
    if (status === StatusFilter.ACTIVE) {
      where.is_active = true;
    } else if (status === StatusFilter.INACTIVE) {
      where.is_active = false;
    }

    // Lọc theo keywords (tìm trong description)
    if (keywords) {
      where.OR = [{ description: { contains: keywords, mode: 'insensitive' } }];
    }

    const [data, total] = await Promise.all([
      this.prisma.warnPenalty.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { min_warn_count: 'asc' },
      }),
      this.prisma.warnPenalty.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Lấy tất cả warn penalties active (cho API check)
   */
  async findAllActive(): Promise<WarnPenalty[]> {
    return this.prisma.warnPenalty.findMany({
      where: {
        is_active: true,
        is_deleted: false,
      },
      orderBy: { min_warn_count: 'asc' },
    });
  }

  /**
   * Lấy chi tiết theo ID
   */
  async findById(id: string): Promise<WarnPenalty | null> {
    return this.prisma.warnPenalty.findFirst({
      where: {
        id,
        is_deleted: false,
      },
    });
  }

  /**
   * Cập nhật warn penalty
   */
  async update(id: string, data: UpdateParams): Promise<WarnPenalty> {
    return this.prisma.warnPenalty.update({
      where: { id },
      data: {
        min_warn_count: data.min_warn_count,
        max_warn_count: data.max_warn_count,
        is_permanent_ban: data.is_permanent_ban,
        duration_value: data.duration_value,
        duration_unit: data.duration_unit,
        description: data.description,
        is_active: data.is_active,
        updated_by: data.updated_by,
      },
    });
  }

  /**
   * Soft delete
   */
  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.warnPenalty.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  /**
   * Soft delete nhiều
   */
  async softDeleteMany(ids: string[], deletedBy: string): Promise<number> {
    const result = await this.prisma.warnPenalty.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
    return result.count;
  }

  /**
   * Kiểm tra khoảng warn có đè lên khoảng khác không
   * @param minCount - Số lần warn tối thiểu
   * @param maxCount - Số lần warn tối đa (null = vô hạn)
   * @param excludeId - ID để loại trừ (khi update)
   * @returns true nếu có khoảng đè lên
   */
  async hasOverlappingRange(
    minCount: number,
    maxCount: number | null,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await this.prisma.warnPenalty.findMany({
      where: {
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: {
        id: true,
        min_warn_count: true,
        max_warn_count: true,
      },
    });

    // Kiểm tra từng khoảng có đè lên không
    for (const item of existing) {
      const existingMin = item.min_warn_count;
      const existingMax = item.max_warn_count;

      // Nếu khoảng mới có max = null (vô hạn)
      if (maxCount === null) {
        // Khoảng mới bắt đầu trước hoặc bằng khoảng hiện tại kết thúc
        if (existingMax === null || minCount <= existingMax) {
          return true;
        }
      }
      // Nếu khoảng hiện tại có max = null (vô hạn)
      else if (existingMax === null) {
        // Khoảng mới kết thúc sau hoặc bằng khoảng hiện tại bắt đầu
        if (maxCount >= existingMin) {
          return true;
        }
      }
      // Cả hai khoảng đều có giới hạn
      else {
        // Kiểm tra overlap: !(end1 < start2 || end2 < start1)
        // => overlap nếu: end1 >= start2 AND end2 >= start1
        if (maxCount >= existingMin && existingMax >= minCount) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Tìm penalty phù hợp với số lần warn
   */
  async findPenaltyForWarnCount(
    warnCount: number,
  ): Promise<WarnPenalty | null> {
    return this.prisma.warnPenalty.findFirst({
      where: {
        is_active: true,
        is_deleted: false,
        min_warn_count: { lte: warnCount },
        OR: [{ max_warn_count: null }, { max_warn_count: { gte: warnCount } }],
      },
      orderBy: { min_warn_count: 'desc' },
    });
  }
}
