import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator yêu cầu permission(s) để truy cập endpoint
 * @param permissions - Các permission key cần thiết
 * @example @RequirePermission('config.update')
 * @example @RequirePermission('config.update', 'config.reset')
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
