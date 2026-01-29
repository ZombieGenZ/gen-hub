import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { warehouseQuotationSelect } from './selects';

/**
 * Interface warehouse data cho báo giá
 */
export interface IWarehouseForQuotation {
    id: string;
    name: string;
    price_per_month: any;
    is_rented: boolean;
    rental_status: string | null;
    is_shared_warehouse: boolean;
    rows: {
        id: string;
        name: string;
        price_per_month: any;
        is_rented: boolean;
    }[];
    discount_configs: {
        id: string;
        discount_percent: any;
        duration_tier_id: string;
        duration_tier: {
            id: string;
            name: string;
            duration_value: number;
            duration_unit: string;
        };
    }[];
}

@Injectable()
export class PublicQuotationRepository {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Lấy thông tin warehouse template cho báo giá
     */
    async findWarehouseForQuotation(id: string): Promise<IWarehouseForQuotation | null> {
        return this.prisma.warehouseTemplate.findFirst({
            where: { id, is_deleted: false, is_active: true },
            select: warehouseQuotationSelect,
        }) as Promise<IWarehouseForQuotation | null>;
    }

    /**
     * Lấy thông tin gói thời gian thuê
     */
    async findDurationTier(id: string) {
        return this.prisma.rentalDurationTier.findFirst({
            where: { id, is_deleted: false, is_active: true },
        });
    }

    /**
     * Lấy danh sách addon theo IDs
     */
    async findAddonsByIds(ids: string[]) {
        return this.prisma.addon.findMany({
            where: { id: { in: ids }, is_deleted: false, is_active: true },
        });
    }

    /**
     * Lấy thông tin bảo hiểm
     */
    async findInsurance(id: string) {
        return this.prisma.insurance.findFirst({
            where: { id, is_deleted: false, is_active: true },
        });
    }

    /**
     * Lấy thông tin coupon còn hiệu lực
     */
    async findValidCoupon(code: string) {
        return this.prisma.coupon.findFirst({
            where: {
                code,
                is_deleted: false,
                is_active: true,
                OR: [
                    { is_permanent: true },
                    {
                        starts_at: { lte: new Date() },
                        ends_at: { gte: new Date() },
                    },
                ],
            },
        });
    }
}
