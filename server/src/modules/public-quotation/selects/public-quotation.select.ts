import { Prisma } from '@prisma/client';

/**
 * Select fields cho warehouse template khi tính báo giá
 */
export const warehouseQuotationSelect = {
    id: true,
    name: true,
    price_per_month: true,
    is_rented: true,
    rental_status: true,
    is_shared_warehouse: true,
    rows: {
        where: { is_deleted: false, is_active: true },
        select: {
            id: true,
            name: true,
            price_per_month: true,
            is_rented: true,
        },
    },
    discount_configs: {
        where: { is_deleted: false, is_active: true },
        select: {
            id: true,
            discount_percent: true,
            duration_tier_id: true,
            duration_tier: {
                select: {
                    id: true,
                    name: true,
                    duration_value: true,
                    duration_unit: true,
                },
            },
        },
    },
} satisfies Prisma.WarehouseTemplateSelect;
