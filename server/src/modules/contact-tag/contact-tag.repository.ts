import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IContactTagWithRelations } from './interfaces';

@Injectable()
export class ContactTagRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.ContactTagCreateInput): Promise<IContactTagWithRelations> {
        return this.prisma.contactTag.create({ data });
    }

    async findAll(params: {
        skip?: number;
        take?: number;
        where?: Prisma.ContactTagWhereInput;
        orderBy?: Prisma.ContactTagOrderByWithRelationInput;
    }): Promise<IContactTagWithRelations[]> {
        const { skip, take, where, orderBy } = params;
        return this.prisma.contactTag.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }

    async count(where?: Prisma.ContactTagWhereInput): Promise<number> {
        return this.prisma.contactTag.count({ where });
    }

    async findById(id: string): Promise<IContactTagWithRelations | null> {
        return this.prisma.contactTag.findFirst({
            where: { id, is_deleted: false },
        });
    }

    async findByName(name: string): Promise<IContactTagWithRelations | null> {
        return this.prisma.contactTag.findFirst({
            where: { name, is_deleted: false },
        });
    }

    async findAllActive(): Promise<IContactTagWithRelations[]> {
        return this.prisma.contactTag.findMany({
            where: { is_active: true, is_deleted: false },
            orderBy: { name: 'asc' },
        });
    }

    async update(id: string, data: Prisma.ContactTagUpdateInput): Promise<IContactTagWithRelations> {
        return this.prisma.contactTag.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: string, userId: string): Promise<IContactTagWithRelations> {
        // Đồng thời soft delete các mapping liên quan
        await this.prisma.contactTagOnConversation.updateMany({
            where: { tag_id: id, is_deleted: false },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        return this.prisma.contactTag.update({
            where: { id },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }

    async findByIds(ids: string[]): Promise<IContactTagWithRelations[]> {
        return this.prisma.contactTag.findMany({
            where: { id: { in: ids }, is_deleted: false },
        });
    }

    async softDeleteMany(ids: string[], userId: string): Promise<void> {
        // Đồng thời soft delete các mapping liên quan
        await this.prisma.contactTagOnConversation.updateMany({
            where: { tag_id: { in: ids }, is_deleted: false },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });

        await this.prisma.contactTag.updateMany({
            where: { id: { in: ids } },
            data: {
                is_deleted: true,
                is_active: false,
                deleted_at: new Date(),
                deleted_by: userId,
            },
        });
    }
}
