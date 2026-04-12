import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_ANY_KEY = 'permissions_any';

/**
 * Decorator yêu cầu ÍT NHẤT MỘT trong các permission(s) để truy cập endpoint
 * @param permissions - Các permission key, chỉ cần có 1 là đủ
 * @example @RequireAnyPermission('backup.admin', 'backup.trigger')
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_ANY_KEY, permissions);
