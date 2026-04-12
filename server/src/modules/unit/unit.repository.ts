import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IUnit, IPaginatedResponse } from './interfaces';
import { QueryUnitDto } from './dto';

@Injectable()
export class UnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra organization tồn tại
   */
  async orgExists(orgId: string): Promise<boolean> {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, is_deleted: false },
      select: { id: true },
    });
    return !!org;
  }

  /**
   * Kiểm tra tên đơn vị tính trùng trong organization
   */
  async nameExistsInOrg(
    name: string,
    orgId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const unit = await this.prisma.unit.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        organization_id: orgId,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return !!unit;
  }

  /**
   * Tạo mới Unit
   */
  async create(data: Prisma.UnitCreateInput): Promise<IUnit> {
    return this.prisma.unit.create({
      data,
    }) as unknown as IUnit;
  }

  /**
   * Lấy danh sách Unit theo organization (có phân trang và lọc)
   */
  async findByOrgId(
    orgId: string,
    query: QueryUnitDto,
  ): Promise<IPaginatedResponse<IUnit>> {
    const { limit = 20, offset = 0, keywords, is_active } = query;

    const where: Prisma.UnitWhereInput = {
      organization_id: orgId,
      is_deleted: false,
    };

    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { description: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      items: items as unknown as IUnit[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Lấy Unit theo ID và organization
   */
  async findByIdAndOrgId(id: string, orgId: string): Promise<IUnit | null> {
    return this.prisma.unit.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
    }) as unknown as IUnit | null;
  }

  /**
   * Cập nhật Unit
   */
  async update(id: string, data: Prisma.UnitUpdateInput): Promise<IUnit> {
    return this.prisma.unit.update({
      where: { id },
      data,
    }) as unknown as IUnit;
  }

  /**
   * Soft delete Unit
   */
  async softDelete(id: string, deletedBy?: string): Promise<void> {
    await this.prisma.unit.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        is_active: false,
        deleted_by: deletedBy,
      },
    });
  }

  /**
   * Soft delete nhiều Unit
   */
  async softDeleteMany(ids: string[], deletedBy?: string): Promise<void> {
    await this.prisma.unit.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        is_active: false,
        deleted_by: deletedBy,
      },
    });
  }

  /**
   * Lấy nhiều Unit theo IDs
   */
  async findByIds(
    ids: string[],
  ): Promise<{ id: string; name: string | null; organization_id: string }[]> {
    return this.prisma.unit.findMany({
      where: { id: { in: ids }, is_deleted: false },
      select: { id: true, name: true, organization_id: true },
    });
  }

  /**
   * Kiểm tra đơn vị tính có đang được sử dụng bởi sản phẩm không
   */
  async isUsedByProduct(id: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { base_unit_id: id, is_deleted: false },
    });
    return count > 0;
  }
}
