import { Injectable } from '@nestjs/common';
import { Prisma, CustomerReview } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomerReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.CustomerReviewUncheckedCreateInput,
  ): Promise<CustomerReview> {
    return this.prisma.customerReview.create({ data });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CustomerReviewWhereInput;
    orderBy?: Prisma.CustomerReviewOrderByWithRelationInput[];
  }): Promise<CustomerReview[]> {
    const { skip, take, where, orderBy } = params;

    return this.prisma.customerReview.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async count(where?: Prisma.CustomerReviewWhereInput): Promise<number> {
    return this.prisma.customerReview.count({ where });
  }

  async findFirst(
    where: Prisma.CustomerReviewWhereInput,
  ): Promise<CustomerReview | null> {
    return this.prisma.customerReview.findFirst({ where });
  }

  async update(
    id: string,
    data: Prisma.CustomerReviewUncheckedUpdateInput,
  ): Promise<CustomerReview> {
    return this.prisma.customerReview.update({
      where: { id },
      data,
    });
  }

  async findByIds(
    where: Prisma.CustomerReviewWhereInput,
  ): Promise<Pick<CustomerReview, 'id' | 'customer_name'>[]> {
    return this.prisma.customerReview.findMany({
      where,
      select: {
        id: true,
        customer_name: true,
      },
    });
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.prisma.customerReview.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }

  async softDeleteMany(ids: string[], deletedBy: string): Promise<void> {
    await this.prisma.customerReview.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
  }
}
