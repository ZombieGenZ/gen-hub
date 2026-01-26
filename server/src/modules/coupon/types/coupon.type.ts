/**
 * Type definitions for Coupon module
 */

import { Coupon, CouponDiscountType, CouponType, RentalDurationUnit } from '@prisma/client';

export type CouponDiscountTypeEnum = CouponDiscountType;
export type CouponTypeEnum = CouponType;
export type RentalDurationUnitEnum = RentalDurationUnit;

export interface CouponWithTargets extends Coupon {
    target_users?: Array<{ id: string; user_id: string; is_active: boolean }>;
    target_warehouses?: Array<{ id: string; warehouse_template_id: string; is_active: boolean }>;
    target_rows?: Array<{ id: string; row_template_id: string; is_active: boolean }>;
    target_addons?: Array<{ id: string; addon_id: string; is_active: boolean }>;
    target_insurances?: Array<{ id: string; insurance_id: string; is_active: boolean }>;
}

export interface CouponWithGifts extends Coupon {
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

export interface CouponWithTargetsAndGifts extends CouponWithTargets, CouponWithGifts {}

export interface CouponFilter {
    keywords?: string;
    is_active?: boolean;
    is_public?: boolean;
    coupon_type?: CouponTypeEnum;
    discount_type?: CouponDiscountTypeEnum;
}
