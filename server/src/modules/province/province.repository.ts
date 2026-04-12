import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IProvince, IProvinceWithWards } from './types';
import { QueryProvinceDto } from './dto';
import {
  provinceDetailSelect,
  provinceListSelect,
} from './selects/province.select';

@Injectable()
export class ProvinceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả tỉnh/thành với filter
   */
  async findMany(query: QueryProvinceDto): Promise<IProvince[]> {
    const { keywords, type } = query;

    const where: Prisma.ProvinceWhereInput = {
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
      where.type = type;
    }

    const items = await this.prisma.province.findMany({
      where,
      orderBy: { name: 'asc' },
      select: provinceListSelect,
    });

    return items as IProvince[];
  }

  /**
   * Lấy chi tiết tỉnh/thành theo ID, bao gồm danh sách phường/xã
   */
  async findById(id: string): Promise<IProvinceWithWards | null> {
    const province = await this.prisma.province.findFirst({
      where: { id, is_deleted: false, is_active: true },
      select: provinceDetailSelect,
    });

    return province as IProvinceWithWards | null;
  }
}
