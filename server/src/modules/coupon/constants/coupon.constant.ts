/**
 * Constants for Coupon module
 */

export const COUPON_DISCOUNT_TYPES = {
  PERCENT: 'PERCENT',
  AMOUNT: 'AMOUNT',
  FREE_MONTHS: 'FREE_MONTHS',
} as const;

export const COUPON_TYPES = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;

export const COUPON_DURATION_UNITS = {
  HOUR: 'HOUR',
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
} as const;

export const COUPON_RENTAL_DURATION_UNITS = {
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  YEAR: 'YEAR',
} as const;

export const COUPON_TRANSACTION_TYPES = {
  NEW_CONTRACT: 'NEW_CONTRACT',
  RENEWAL: 'RENEWAL',
} as const;
