import { SetMetadata } from '@nestjs/common';

export const WM_PERMISSION_KEY = 'wm_permission';

/**
 * Decorator yêu cầu Warehouse Manager permission để truy cập endpoint
 * Sử dụng hệ thống permission riêng của Warehouse Manager (WarehouseManagerPermission)
 * Không phải system permission
 * @param permission - Permission code cần thiết (ví dụ: 'warehouse.view')
 * @example @RequireWMPermission('warehouse.view')
 */
export const RequireWMPermission = (permission: string) =>
  SetMetadata(WM_PERMISSION_KEY, permission);
