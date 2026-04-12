/**
 * Constants for Coupon Schedule module
 */

import { CouponSchedulePeriod } from '@prisma/client';

export const COUPON_SCHEDULE_PERIODS = {
  YEARLY: 'YEARLY' as CouponSchedulePeriod,
  QUARTERLY: 'QUARTERLY' as CouponSchedulePeriod,
  MONTHLY: 'MONTHLY' as CouponSchedulePeriod,
  WEEKLY: 'WEEKLY' as CouponSchedulePeriod,
  DAILY: 'DAILY' as CouponSchedulePeriod,
} as const;

export const COUPON_SCHEDULE_DURATION_UNITS = {
  HOUR: 'HOUR',
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
} as const;
