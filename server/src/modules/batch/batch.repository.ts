import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IBatch, IPaginatedResponse } from './interfaces';
import { QueryBatchDto } from './dto';

@Injectable()
export class BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Kiểm tra product tồn tại và thuộc tổ chức
   */
  async productExistsInOrg(productId: string, orgId: string): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organization_id: orgId, is_deleted: false },
      select: { id: true },
    });
    return !!product;
  }

  /**
   * Lấy org ID từ product
   */
  async getOrgIdFromProduct(productId: string): Promise<string | null> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, is_deleted: false },
      select: { organization_id: true },
    });
    return product?.organization_id || null;
  }

  /**
   * Kiểm tra code trùng
   */
  async codeExistsInProduct(
    code: string,
    productId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const batch = await this.prisma.batch.findFirst({
      where: {
        code,
        product_id: productId,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return !!batch;
  }

  async create(data: Prisma.BatchCreateInput): Promise<IBatch> {
    return this.prisma.batch.create({
      data,
      include: {
        product: {
          select: { id: true, name: true, sku: true, organization_id: true },
        },
      },
    }) as unknown as IBatch;
  }

  async findByProductId(
    productId: string,
    query: QueryBatchDto,
  ): Promise<IPaginatedResponse<IBatch>> {
    const { limit = 20, offset = 0, keywords, is_active } = query;

    const where: Prisma.BatchWhereInput = {
      product_id: productId,
      is_deleted: false,
    };

    if (keywords) {
      where.code = { contains: keywords, mode: 'insensitive' };
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [items, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          product: {
            select: { id: true, name: true, sku: true, organization_id: true },
          },
        },
      }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      items: items as unknown as IBatch[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async findById(id: string): Promise<IBatch | null> {
    return this.prisma.batch.findFirst({
      where: { id, is_deleted: false },
      include: {
        product: {
          select: { id: true, name: true, sku: true, organization_id: true },
        },
      },
    }) as unknown as IBatch | null;
  }

  async findByIdAndOrg(id: string, orgId: string): Promise<IBatch | null> {
    return this.prisma.batch.findFirst({
      where: {
        id,
        is_deleted: false,
        product: { organization_id: orgId },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true, organization_id: true },
        },
      },
    }) as unknown as IBatch | null;
  }

  async update(id: string, data: Prisma.BatchUpdateInput): Promise<IBatch> {
    return this.prisma.batch.update({
      where: { id },
      data,
      include: {
        product: {
          select: { id: true, name: true, sku: true, organization_id: true },
        },
      },
    }) as unknown as IBatch;
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    await this.prisma.batch.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: actorId,
        is_active: false,
      },
    });
  }

  async softDeleteMany(ids: string[], actorId: string): Promise<void> {
    await this.prisma.batch.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: actorId,
        is_active: false,
      },
    });
  }

  async findByIds(ids: string[]): Promise<IBatch[]> {
    return this.prisma.batch.findMany({
      where: { id: { in: ids }, is_deleted: false },
      include: {
        product: {
          select: { id: true, name: true, sku: true, organization_id: true },
        },
      },
    }) as unknown as IBatch[];
  }
}
