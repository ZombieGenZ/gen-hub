import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IWard, IWardWithProvince } from './interfaces';
import { QueryWardDto } from './dto';

@Injectable()
export class WardRepository {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Lấy danh sách tất cả phường/xã với filter
     */
    async findMany(query: QueryWardDto): Promise<IWard[]> {
        const { keywords, type, province_id } = query;

        const where: Prisma.WardWhereInput = {
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

        if (province_id) {
            where.province_id = province_id;
        }

        const items = await this.prisma.ward.findMany({
            where,
            orderBy: { name: 'asc' },
            select: {
                id: true,
                code: true,
                name: true,
                slug: true,
                type: true,
                province_id: true,
                is_active: true,
                created_at: true,
                updated_at: true,
            },
        });

        return items as IWard[];
    }

    /**
     * Lấy chi tiết phường/xã theo ID
     */
    async findById(id: string): Promise<IWardWithProvince | null> {
        const ward = await this.prisma.ward.findFirst({
            where: { id, is_deleted: false, is_active: true },
            include: {
                province: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
        });

        return ward as IWardWithProvince | null;
    }

    /**
     * Lấy danh sách phường/xã theo province ID
     */
    async findByProvinceId(provinceId: string, query: QueryWardDto): Promise<IWard[]> {
        const queryWithProvince = { ...query, province_id: provinceId };
        return this.findMany(queryWithProvince);
    }
}
