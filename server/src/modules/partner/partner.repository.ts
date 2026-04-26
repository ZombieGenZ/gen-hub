import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IPartner, IPaginatedResponse } from './interfaces';
import { QueryPartnerDto } from './dto';

@Injectable()
export class PartnerRepository {
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
   * Kiểm tra ward tồn tại
   */
  async wardExists(wardId: string): Promise<boolean> {
    const ward = await this.prisma.ward.findFirst({
      where: { id: wardId, is_deleted: { not: true } },
      select: { id: true },
    });
    return !!ward;
  }

  /**
   * Kiểm tra code trùng trong organization
   */
  async codeExistsInOrg(
    code: string,
    orgId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const partner = await this.prisma.partner.findFirst({
      where: {
        code,
        organization_id: orgId,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return !!partner;
  }

  /**
   * Tạo mới Partner
   */
  async create(data: Prisma.PartnerCreateInput): Promise<IPartner> {
    return this.prisma.partner.create({
      data,
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
      },
    }) as unknown as IPartner;
  }

  /**
   * Lấy danh sách Partner theo organization
   */
  async findByOrgId(
    orgId: string,
    query: QueryPartnerDto,
  ): Promise<IPaginatedResponse<IPartner>> {
    const { limit = 20, offset = 0, keywords, type, is_active } = query;

    const where: Prisma.PartnerWhereInput = {
      organization_id: orgId,
      is_deleted: false,
    };

    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { code: { contains: keywords, mode: 'insensitive' } },
        { email: { contains: keywords, mode: 'insensitive' } },
        { phone: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [items, total] = await Promise.all([
      this.prisma.partner.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          ward: {
            select: {
              id: true,
              name: true,
              province: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.partner.count({ where }),
    ]);

    return {
      items: items as unknown as IPartner[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Lấy Partner theo ID và organization
   */
  async findByIdAndOrgId(id: string, orgId: string): Promise<IPartner | null> {
    return this.prisma.partner.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
      },
    }) as unknown as IPartner | null;
  }

  /**
   * Cập nhật Partner
   */
  async update(id: string, data: Prisma.PartnerUpdateInput): Promise<IPartner> {
    return this.prisma.partner.update({
      where: { id },
      data,
      include: {
        ward: {
          select: {
            id: true,
            name: true,
            province: { select: { id: true, name: true } },
          },
        },
      },
    }) as unknown as IPartner;
  }

  /**
   * Soft delete Partner
   */
  async softDelete(id: string): Promise<void> {
    await this.prisma.partner.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        is_active: false,
      },
    });
  }

  async softDeleteMany(ids: string[]): Promise<void> {
    await this.prisma.partner.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        is_active: false,
      },
    });
  }

  async findByIds(
    ids: string[],
  ): Promise<{ id: string; name: string; organization_id: string }[]> {
    return this.prisma.partner.findMany({
      where: { id: { in: ids }, is_deleted: false },
      select: { id: true, name: true, organization_id: true },
    });
  }
}
