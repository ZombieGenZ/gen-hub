import { Prisma } from '@prisma/client';

/**
 * Prisma select objects for Public Coupon queries
 * Optimize queries by selecting only necessary fields
 */

/**
 * Basic coupon fields for public list
 */
export const publicCouponBasicSelect: Prisma.CouponSelect = {
    id: true,
    name: true,
    description: true,
    code: true,
    discount_type: true,
    discount_value: true,
    is_unlimited_discount: true,
    max_discount_amount: true,
    is_permanent: true,
    starts_at: true,
    ends_at: true,
    max_usage: true,
    current_usage: true,
    created_at: true,
};

/**
 * Coupon with targets for validation
 */
export const publicCouponWithTargetsSelect: Prisma.CouponSelect = {
    ...publicCouponBasicSelect,
    coupon_type: true,
    apply_for_first_rental: true,
    apply_for_renewal: true,
    require_min_warehouses: true,
    min_warehouses: true,
    require_min_rows: true,
    min_rows: true,
    apply_for_all_warehouses: true,
    apply_for_all_rows: true,
    apply_for_all_addons: true,
    apply_for_all_insurances: true,
    target_users: {
        where: { is_active: true },
        select: {
            id: true,
            user_id: true,
            is_active: true,
        },
    },
    target_warehouses: {
        where: { is_active: true },
        select: {
            id: true,
            warehouse_template_id: true,
            is_active: true,
        },
    },
    target_rows: {
        where: { is_active: true },
        select: {
            id: true,
            row_template_id: true,
            is_active: true,
        },
    },
    target_addons: {
        where: { is_active: true },
        select: {
            id: true,
            addon_id: true,
            is_active: true,
        },
    },
    target_insurances: {
        where: { is_active: true },
        select: {
            id: true,
            insurance_id: true,
            is_active: true,
        },
    },
};
