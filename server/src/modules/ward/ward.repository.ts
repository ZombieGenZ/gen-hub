import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IWard, IWardWithProvince } from './types';
import { QueryWardDto } from './dto';
import { wardDetailSelect, wardListSelect } from './selects/ward.select';

@Injectable()
export class WardRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả phường/xã với filter
   */
  async findMany(query: QueryWardDto): Promise<IWard[]> {
    const { keywords, type, province_id } = query;

    const where: Prisma.WardWhereInput = {
      is_deleted: false,
      is_active: true,
    };

    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { code: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type as any;
    }

    if (province_id) {
      where.province_id = province_id;
    }

    const items = await this.prisma.ward.findMany({
      where,
      orderBy: { name: 'asc' },
      select: wardListSelect,
    });

    return items as IWard[];
  }

  /**
   * Lấy chi tiết phường/xã theo ID
   */
  async findById(id: string): Promise<IWardWithProvince | null> {
    const ward = await this.prisma.ward.findFirst({
      where: { id, is_deleted: false, is_active: true },
      select: wardDetailSelect,
    });

    return ward as IWardWithProvince | null;
  }

  /**
   * Lấy danh sách phường/xã theo province ID
   */
  async findByProvinceId(
    provinceId: string,
    query: QueryWardDto,
  ): Promise<IWard[]> {
    const queryWithProvince = { ...query, province_id: provinceId };
    return this.findMany(queryWithProvince);
  }
}
