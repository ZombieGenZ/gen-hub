import { Prisma } from '@prisma/client';
import Decimal = Prisma.Decimal;
import { CouponSchedulePeriod, CouponDiscountType, DurationUnit, CouponDurationUnit } from '@prisma/client';

/**
 * Interface cho phân trang response
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
}

/**
 * Interface cho CouponSchedule
 */
export interface ICouponSchedule {
    id: string;
    name: string;
    description?: string | null;

    period: CouponSchedulePeriod;

    scheduled_day?: number | null;
    scheduled_month?: number | null;
    scheduled_weekday?: number | null;
    scheduled_hour?: number | null;
    scheduled_minute?: number | null;

    is_random_code: boolean;
    is_fixed_code: boolean;
    fixed_code_value?: string | null;

    use_suffix: boolean;
    use_prefix: boolean;

    is_permanent_coupon: boolean;
    coupon_duration_value?: number | null;
    coupon_duration_unit?: CouponDurationUnit | null;

    discount_value: Decimal;
    discount_type: CouponDiscountType;

    require_min_warehouses: boolean;
    min_warehouses?: number | null;

    require_min_rows: boolean;
    min_rows?: number | null;

    require_min_order_amount: boolean;
    min_order_amount?: Decimal | null;

    require_min_rental_duration: boolean;
    min_rental_duration_value?: number | null;
    min_rental_duration_unit?: DurationUnit | null;

    is_unlimited_discount: boolean;
    max_discount_amount?: Decimal | null;

    max_usage: number;
    is_public: boolean;
    apply_for_first_rental: boolean;
    apply_for_renewal: boolean;

    last_run_at?: Date | null;
    next_run_at?: Date | null;

    is_active: boolean;
    created_at: Date;
    updated_at?: Date | null;
    is_deleted?: boolean | null;
    deleted_at?: Date | null;

    created_by: string;
    updated_by?: string | null;
    deleted_by?: string | null;
}
