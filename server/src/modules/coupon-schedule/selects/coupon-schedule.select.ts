import { Prisma } from '@prisma/client';

/**
 * Prisma select objects for Coupon Schedule queries
 * Optimize queries by selecting only necessary fields
 */

/**
 * Basic coupon schedule fields (for list views)
 */
export const couponScheduleBasicSelect: Prisma.CouponScheduleSelect = {
    id: true,
    name: true,
    description: true,
    period: true,
    scheduled_day: true,
    scheduled_month: true,
    scheduled_weekday: true,
    scheduled_hour: true,
    scheduled_minute: true,
    is_random_code: true,
    is_fixed_code: true,
    fixed_code_value: true,
    use_prefix: true,
    use_suffix: true,
    is_permanent_coupon: true,
    coupon_duration_value: true,
    coupon_duration_unit: true,
    discount_type: true,
    discount_value: true,
    max_usage: true,
    is_active: true,
    last_run_at: true,
    next_run_at: true,
    created_at: true,
    updated_at: true,
};

/**
 * Full coupon schedule fields (for detail views)
 */
export const couponScheduleFullSelect: Prisma.CouponScheduleSelect = {
    ...couponScheduleBasicSelect,
    require_min_warehouses: true,
    min_warehouses: true,
    require_min_rows: true,
    min_rows: true,
    require_min_order_amount: true,
    min_order_amount: true,
    require_min_rental_duration: true,
    min_rental_duration_value: true,
    min_rental_duration_unit: true,
    is_unlimited_discount: true,
    max_discount_amount: true,
    coupon_type: true,
    apply_for_first_rental: true,
    apply_for_renewal: true,
    apply_for_all_warehouses: true,
    apply_for_all_rows: true,
    apply_for_all_addons: true,
    apply_for_all_insurances: true,
    is_unlimited_stack: true,
    max_stack_count: true,
    has_gift_addons: true,
    has_gift_insurances: true,
    created_by: true,
    updated_by: true,
    deleted_at: true,
    deleted_by: true,
};

/**
 * Coupon schedule with relations (for operations requiring targets/gifts)
 */
export const couponScheduleWithRelationsSelect: Prisma.CouponScheduleSelect = {
    ...couponScheduleFullSelect,
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
    gift_addons: {
        where: { is_active: true },
        select: {
            id: true,
            addon_id: true,
            is_active: true,
            addon: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                },
            },
        },
    },
    gift_insurances: {
        where: { is_active: true },
        select: {
            id: true,
            insurance_id: true,
            is_active: true,
            insurance: {
                select: {
                    id: true,
                    name: true,
                    description: true,
                },
            },
        },
    },
};
