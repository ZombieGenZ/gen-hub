/**
 * Type definitions for Coupon Schedule module
 */

import { CouponSchedule, CouponSchedulePeriod, CouponDiscountType, CouponType, DurationUnit } from '@prisma/client';

export type CouponSchedulePeriodEnum = CouponSchedulePeriod;
export type CouponDiscountTypeEnum = CouponDiscountType;
export type CouponTypeEnum = CouponType;
export type DurationUnitEnum = DurationUnit;

export interface CouponScheduleWithTargets extends CouponSchedule {
    target_users?: Array<{ id: string; user_id: string; is_active: boolean }>;
    target_warehouses?: Array<{ id: string; warehouse_template_id: string; is_active: boolean }>;
    target_rows?: Array<{ id: string; row_template_id: string; is_active: boolean }>;
    target_addons?: Array<{ id: string; addon_id: string; is_active: boolean }>;
}

export interface CouponScheduleWithGifts extends CouponSchedule {
    gift_addons?: Array<{
        id: string;
        addon_id: string;
        is_active: boolean;
        addon?: { id: string; name: string; description: string | null };
    }>;
    gift_insurances?: Array<{
        id: string;
        insurance_id: string;
        is_active: boolean;
        insurance?: { id: string; name: string; description: string | null };
    }>;
}

export interface CouponScheduleWithTargetsAndGifts extends CouponScheduleWithTargets, CouponScheduleWithGifts {}

export interface CouponScheduleFilter {
    keywords?: string;
    is_active?: boolean;
    period?: CouponSchedulePeriodEnum;
}
