import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IProvince, IProvinceWithWards } from './interfaces';
import { QueryProvinceDto } from './dto';

@Injectable()
export class ProvinceRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách tỉnh/thành có phân trang và filter
     */
    async findMany(query: QueryProvinceDto): Promise<{ items: IProvince[]; total: number }> {
        const { limit = 100, offset = 0, keywords, type } = query;

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
            where.type = type as any;
        }

        const [items, total] = await Promise.all([
            this.prisma.province.findMany({
                where,
                take: limit,
                skip: offset,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    slug: true,
                    type: true,
                    is_active: true,
                    created_at: true,
                    updated_at: true,
                },
            }),
            this.prisma.province.count({ where }),
        ]);

        return { items: items as IProvince[], total };
    }

    /**
     * Lấy chi tiết tỉnh/thành theo ID, bao gồm danh sách phường/xã
     */
    async findById(id: string): Promise<IProvinceWithWards | null> {
        const province = await this.prisma.province.findFirst({
            where: { id, is_deleted: false, is_active: true },
            include: {
                wards: {
                    where: { is_deleted: false, is_active: true },
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        slug: true,
                        type: true,
                    },
                    orderBy: { name: 'asc' },
                },
            },
        });

        return province as IProvinceWithWards | null;
    }
}
