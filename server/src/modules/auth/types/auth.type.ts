import { IDeviceInfo } from '../../../common/interfaces';

/**
 * Login result when 2FA is required
 */
export interface ILogin2FARequired {
  message: string;
  requires_2fa: true;
  temp_token: string;
}

/**
 * Login result on success
 */
export interface ILoginSuccess {
  message: string;
  user: ISanitizedUser;
  access_token: string;
  refresh_token: string;
}

/**
 * Union type for login results
 */
export type ILoginResult = ILogin2FARequired | ILoginSuccess;

/**
 * Sanitized user data (no sensitive fields)
 */
export interface ISanitizedUser {
  id: string;
  name: string;
  email: string | null;
  email_confirmed: boolean;
  is_verified: boolean | null;
  two_factor_enabled: boolean;
  language: string;
  created_at: Date;
}

/**
 * Token pair
 */
export interface ITokenPair {
  access_token: string;
  refresh_token: string;
}

/**
 * Auth user data for caching - includes fields needed for auth operations
 */
export interface ICachedAuthUser {
  id: string;
  email: string | null;
  password: string | null;
  name: string;
  email_confirmed: boolean;
  is_verified: boolean | null;
  is_banned: boolean | null;
  banned_end: Date | null;
  two_factor_enabled: boolean;
  two_factor_token: string | null;
  language: string;
  created_at: Date;
}

/**
 * Permission check result for caching
 */
export interface ICachedPermissionCheck {
  userId: string;
  permission: string;
  hasPermission: boolean;
  checkedAt: number; // timestamp for cache validation
}

/**
 * Cached refresh token data
 */
export interface ICachedRefreshToken {
  id: string;
  user_id: string;
  token: string;
  ip?: string;
  device?: string;
  created_at: Date;
}

/**
 * Email verification user data for caching
 */
export interface ICachedEmailVerifyUser {
  id: string;
  email: string | null;
  name: string;
  email_verify_token: string | null;
  email_verify_expired: Date | null;
}

/**
 * Forgot password user data for caching
 */
export interface ICachedForgotPasswordUser {
  id: string;
  email: string | null;
  name: string;
  forgot_password_token: string | null;
  forgot_password_expired: Date | null;
}

/**
 * Panel login permission requirements
 */
export interface IPanelPermissionConfig {
  panelType: 'database' | 'featureflag' | 'resources' | 'admin';
  requiredPermissions: string[];
  deniedMessageKey: string;
  successMessageKey: string;
}

/**
 * Device info for login tracking
 */
export type { IDeviceInfo };
