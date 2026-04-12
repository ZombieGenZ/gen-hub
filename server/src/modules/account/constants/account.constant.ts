/**
 * Account module constants
 * Định nghĩa các hằng số sử dụng trong Account module
 */

/**
 * Valid confirmation strings for account deletion
 */
export const VALID_DELETE_CONFIRMATIONS = [
  'XÓA TÀI KHOẢN',
  'DELETE ACCOUNT',
] as const;

/**
 * Default language
 */
export const DEFAULT_LANGUAGE = 'vi';

/**
 * Default Argon2 configuration values
 */
export const ARGON2_DEFAULTS = {
  MEMORY_COST: 65536,
  TIME_COST: 3,
  PARALLELISM: 1,
} as const;

/**
 * Cache configuration defaults
 */
export const CACHE_DEFAULTS = {
  PROFILE_TTL: 300,
  FULL_DATA_TTL: 180,
  PROFILE_KEY_PREFIX: 'account:profile',
  FULL_DATA_KEY_PREFIX: 'account:fulldata',
} as const;
