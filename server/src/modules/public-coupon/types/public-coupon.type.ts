/**
 * Type definitions for Public Coupon module
 */

import { Coupon, CouponDiscountType } from '@prisma/client';

export interface PublicCouponFilter {
  keywords?: string;
  is_active?: boolean;
}

export interface SavedCouponWithDetails {
  id: string;
  user_id: string;
  coupon_id: string;
  created_at: Date;
  coupon: Coupon;
}

export interface ApplicableCoupon extends Coupon {
  discount_info?: {
    discount_type: CouponDiscountType;
    discount_value: number;
    max_discount_amount: number | null;
  };
}
