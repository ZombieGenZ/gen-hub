import { SetMetadata } from '@nestjs/common';

export const ORG_PERMISSIONS_KEY = 'org_permissions';

/**
 * Decorator để yêu cầu quyền cấp tổ chức
 * Sử dụng với OrgPermissionGuard để kiểm tra quyền trong organization
 * @param permissions - Danh sách quyền cần kiểm tra
 */
export const RequireOrgPermission = (...permissions: string[]) =>
    SetMetadata(ORG_PERMISSIONS_KEY, permissions);
