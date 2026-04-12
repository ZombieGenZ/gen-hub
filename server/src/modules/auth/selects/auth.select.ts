import { Prisma } from '@prisma/client';

/**
 * Minimal user select for login operations
 * Only fields needed for authentication - reduces data transfer
 */
export const AUTH_USER_LOGIN_SELECT = {
  id: true,
  email: true,
  password: true,
  name: true,
  email_confirmed: true,
  is_verified: true,
  is_banned: true,
  banned_end: true,
  two_factor_enabled: true,
  two_factor_token: true,
  language: true,
  created_at: true,
} as const satisfies Prisma.UserSelect;

/**
 * User select for sanitized response (public data only)
 */
export const AUTH_USER_SANITIZED_SELECT = {
  id: true,
  name: true,
  email: true,
  email_confirmed: true,
  is_verified: true,
  two_factor_enabled: true,
  language: true,
  created_at: true,
} as const satisfies Prisma.UserSelect;

/**
 * User select for email verification
 */
export const AUTH_USER_EMAIL_VERIFY_SELECT = {
  id: true,
  email: true,
  name: true,
  email_verify_token: true,
  email_verify_expired: true,
} as const satisfies Prisma.UserSelect;

/**
 * User select for forgot password operations
 */
export const AUTH_USER_FORGOT_PASSWORD_SELECT = {
  id: true,
  email: true,
  name: true,
  forgot_password_token: true,
  forgot_password_expired: true,
} as const satisfies Prisma.UserSelect;

/**
 * User select for 2FA operations
 */
export const AUTH_USER_2FA_SELECT = {
  id: true,
  email: true,
  name: true,
  two_factor_enabled: true,
  two_factor_token: true,
} as const satisfies Prisma.UserSelect;

/**
 * User select for password change operations
 */
export const AUTH_USER_PASSWORD_SELECT = {
  id: true,
  password: true,
} as const satisfies Prisma.UserSelect;

/**
 * Refresh token select for validation
 */
export const REFRESH_TOKEN_SELECT = {
  id: true,
  user_id: true,
  token: true,
  ip: true,
  device: true,
  created_at: true,
} as const satisfies Prisma.RefreshTokenSelect;

/**
 * User permission check select - minimal fields for permission validation
 */
export const AUTH_USER_PERMISSION_CHECK_SELECT = {
  id: true,
  is_banned: true,
  banned_end: true,
} as const satisfies Prisma.UserSelect;
