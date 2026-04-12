import {
  User,
  RefreshToken,
  UserWarning,
  WarningCategory,
} from '@prisma/client';

/**
 * Interface cho danh sách users với phân trang
 */
export interface IUserListResult {
  items: IUserListItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface cho item trong danh sách users
 */
export interface IUserListItem {
  id: string;
  name: string;
  email: string | null;
  email_confirmed: boolean;
  is_verified: boolean | null;
  is_banned: boolean | null;
  banned_end: Date | null;
  is_online: boolean;
  last_online: Date | null;
  created_at: Date;
  warning_count?: number;
}

/**
 * Interface cho chi tiết user
 */
export interface IUserDetail extends User {
  warning_count?: number;
  active_warnings?: IUserWarningItem[];
  roles?: { id: string; name: string }[];
}

/**
 * Interface cho warning item
 */
export interface IUserWarningItem {
  id: string;
  reason: string;
  is_permanent: boolean;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  removed_at: Date | null;
  warned_by: string;
  removed_by: string | null;
  category: {
    id: string;
    name: string;
    severity: number;
  };
}

/**
 * Interface cho danh sách warnings với phân trang
 */
export interface IUserWarningsResult {
  items: IUserWarningItem[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface cho session
 */
export interface IUserSession {
  id: string;
  ip: string | null;
  location: string | null;
  device: string | null;
  os: string | null;
  created_at: Date;
  updated_at: Date | null;
}

/**
 * Interface cho danh sách sessions
 */
export interface IUserSessionsResult {
  items: IUserSession[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface cho kết quả roles/permissions của user
 */
export interface IUserRolesAndPermissions {
  roles: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean | null;
  }[];
  permissions: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    source: 'direct' | 'role';
  }[];
}
