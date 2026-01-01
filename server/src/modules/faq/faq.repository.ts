import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IFaqWithRelations } from './interfaces';

@Injectable()
export class FaqRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.FAQCreateInput): Promise<IFaqWithRelations> {
        return this.prisma.fAQ.create({ data });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.FAQWhereInput;
        orderBy?: Prisma.FAQOrderByWithRelationInput;
    }): Promise<IFaqWithRelations[]> {
        const { skip, take, where, orderBy } = params;
        return this.prisma.fAQ.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }

    async count(where?: Prisma.FAQWhereInput): Promise<number> {
        return this.prisma.fAQ.count({ where });
    }

    async findById(id: string): Promise<IFaqWithRelations | null> {
        return this.prisma.fAQ.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findAllActive(): Promise<IFaqWithRelations[]> {
        return this.prisma.fAQ.findMany({
            where: { is_active: true, is_deleted: false },
            orderBy: { order: 'asc' },
        });
    }

    async update(id: string, data: Prisma.FAQUpdateInput): Promise<IFaqWithRelations> {
        return this.prisma.fAQ.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string, userId: string): Promise<IFaqWithRelations> {
        return this.prisma.fAQ.update({
            where: { id },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    async findByIds(ids: string[]): Promise<IFaqWithRelations[]> {
        return this.prisma.fAQ.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    async softDeleteMany(ids: string[], userId: string): Promise<void> {
        await this.prisma.fAQ.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }
}
