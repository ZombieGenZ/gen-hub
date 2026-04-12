import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IProduct, IPaginatedResponse } from './interfaces';
import { QueryProductDto, ProductUnitDto } from './dto';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async orgExists(orgId: string): Promise<boolean> {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, is_deleted: false },
      select: { id: true },
    });
    return !!org;
  }

  async unitExists(unitId: string, orgId: string): Promise<boolean> {
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, organization_id: orgId, is_deleted: false },
      select: { id: true },
    });
    return !!unit;
  }

  async skuExistsInOrg(
    sku: string,
    orgId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: {
        sku,
        organization_id: orgId,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });
    return !!product;
  }

  /**
   * Tạo Product với ProductUnits
   */
  async create(
    data: Prisma.ProductCreateInput,
    units?: ProductUnitDto[],
    actorId?: string,
  ): Promise<IProduct> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data,
        include: {
          base_unit: { select: { id: true, name: true } },
        },
      });

      // Tạo ProductUnits nếu có
      if (units && units.length > 0) {
        await tx.productUnit.createMany({
          data: units.map((unit) => ({
            product_id: product.id,
            unit_id: unit.unit_id,
            conversion_rate: unit.conversion_rate,
            barcode: unit.barcode,
            created_by: actorId || (data.created_by as string),
          })),
        });
      }

      // Lấy lại product với units
      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          base_unit: { select: { id: true, name: true } },
          units: {
            where: { is_deleted: false },
            include: { unit: { select: { id: true, name: true } } },
          },
        },
      }) as unknown as IProduct;
    });
  }

  async findByOrgId(
    orgId: string,
    query: QueryProductDto,
  ): Promise<IPaginatedResponse<IProduct>> {
    const { limit = 20, offset = 0, keywords, is_active, warehouse_id } = query;

    const where: Prisma.ProductWhereInput = {
      organization_id: orgId,
      is_deleted: false,
    };

    if (keywords) {
      where.OR = [
        { name: { contains: keywords, mode: 'insensitive' } },
        { sku: { contains: keywords, mode: 'insensitive' } },
        { barcode: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { created_at: 'desc' },
        include: {
          base_unit: { select: { id: true, name: true } },
          units: {
            where: { is_deleted: false },
            include: { unit: { select: { id: true, name: true } } },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Nếu có warehouse_id, aggregate quantity_available từ Inventory
    let qtyMap: Map<string, number> | null = null;
    if (warehouse_id && items.length > 0) {
      const productIds = items.map((p) => p.id);
      const inventories = await this.prisma.inventory.groupBy({
        by: ['product_id'],
        where: {
          organization_id: orgId,
          warehouse_id,
          product_id: { in: productIds },
          is_deleted: false,
        },
        _sum: { quantity_available: true },
      });
      qtyMap = new Map(
        inventories.map((r) => [
          r.product_id,
          Number(r._sum.quantity_available ?? 0),
        ]),
      );
    }

    const enriched = items.map((p) => ({
      ...p,
      ...(qtyMap !== null ? { quantity_available: qtyMap.get(p.id) ?? 0 } : {}),
    }));

    return {
      items: enriched as unknown as IProduct[],
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  async findByIdAndOrgId(id: string, orgId: string): Promise<IProduct | null> {
    return this.prisma.product.findFirst({
      where: { id, organization_id: orgId, is_deleted: false },
      include: {
        base_unit: { select: { id: true, name: true } },
        units: {
          where: { is_deleted: false },
          include: { unit: { select: { id: true, name: true } } },
        },
      },
    }) as unknown as IProduct | null;
  }

  /**
   * Cập nhật Product và sync ProductUnits
   */
  async update(
    id: string,
    data: Prisma.ProductUpdateInput,
    units?: ProductUnitDto[],
    actorId?: string,
  ): Promise<IProduct> {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data,
      });

      // Sync ProductUnits nếu có
      if (units !== undefined) {
        // Soft delete existing units
        await tx.productUnit.updateMany({
          where: { product_id: id, is_deleted: false },
          data: {
            is_deleted: true,
            deleted_at: new Date(),
            deleted_by: actorId,
          },
        });

        // Create new units
        if (units.length > 0) {
          await tx.productUnit.createMany({
            data: units.map((unit) => ({
              product_id: id,
              unit_id: unit.unit_id,
              conversion_rate: unit.conversion_rate,
              barcode: unit.barcode,
              created_by: actorId || '',
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          base_unit: { select: { id: true, name: true } },
          units: {
            where: { is_deleted: false },
            include: { unit: { select: { id: true, name: true } } },
          },
        },
      }) as unknown as IProduct;
    });
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Soft delete product
      await tx.product.update({
        where: { id },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: actorId,
          is_active: false,
        },
      });

      // Soft delete related units
      await tx.productUnit.updateMany({
        where: { product_id: id, is_deleted: false },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: actorId,
        },
      });
    });
  }

  async softDeleteMany(ids: string[], actorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Soft delete products
      await tx.product.updateMany({
        where: { id: { in: ids } },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: actorId,
          is_active: false,
        },
      });

      // Soft delete related units
      await tx.productUnit.updateMany({
        where: { product_id: { in: ids }, is_deleted: false },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: actorId,
        },
      });
    });
  }

  async findByIds(
    ids: string[],
  ): Promise<{ id: string; name: string; organization_id: string }[]> {
    return this.prisma.product.findMany({
      where: { id: { in: ids }, is_deleted: false },
      select: { id: true, name: true, organization_id: true },
    });
  }
}
