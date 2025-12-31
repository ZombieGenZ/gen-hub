import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationUpdateRequestDto, QueryOrganizationUpdateRequestDto } from './dto';
import { OrganizationUpdateRequestStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrganizationUpdateRequestRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.OrganizationUpdateRequestCreateInput) {
        return this.prisma.organizationUpdateRequest.create({
            data,
            include: {
                organization: {
                    select: { id: true, name: true, tax_code: true },
                },
                requester: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    async findById(id: string) {
        return this.prisma.organizationUpdateRequest.findUnique({
            where: { id },
            include: {
                organization: true,
                requester: {
                    select: { id: true, name: true, email: true },
                },
            },
        });
    }

    async findMany(query: QueryOrganizationUpdateRequestDto) {
        const { status, keyword, limit = 10, offset = 0 } = query;
        const where: Prisma.OrganizationUpdateRequestWhereInput = {
            is_deleted: false,
        };

        if (status) {
            where.status = status;
        }

        if (keyword) {
            where.OR = [
                { organization: { name: { contains: keyword, mode: 'insensitive' } } },
                { organization: { tax_code: { contains: keyword, mode: 'insensitive' } } },
                { tax_code: { contains: keyword, mode: 'insensitive' } },
            ];
        }

        const [total, items] = await Promise.all([
            this.prisma.organizationUpdateRequest.count({ where }),
            this.prisma.organizationUpdateRequest.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { created_at: 'desc' },
                include: {
                    organization: {
                        select: { id: true, name: true, tax_code: true },
                    },
                    requester: {
                        select: { id: true, name: true, email: true },
                    },
                },
            }),
        ]);

        return { total, items, limit, offset };
    }

    async update(id: string, data: Prisma.OrganizationUpdateRequestUpdateInput) {
        return this.prisma.organizationUpdateRequest.update({
            where: { id },
            data,
        });
    }
}
