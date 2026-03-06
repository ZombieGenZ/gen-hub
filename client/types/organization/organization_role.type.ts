export interface OrganizationRoleData {
   organization_id: string
   role: string
}

/**
 * Vai trò tổ chức
 */
export interface OrganizationRole {
   id: string;
   name: string;
   description: string | null;
   organization_id: string;
   is_system: boolean;
   is_deleted: boolean;
   created_at: string;
   updated_at: string | null;
   permissions: OrganizationPermission[];
   _count?: {
      members: number;
   };
}

/**
 * Quyền trong tổ chức
 */
export interface OrganizationPermission {
   id: string;
   key: string;
   name: string;
   description: string | null;
   module: string;
   is_active: boolean;
}

/**
 * Phản hồi danh sách vai trò
 */
export interface OrganizationRolesResponse {
   items: OrganizationRole[];
   total: number;
   limit: number;
   offset: number;
}

/**
 * DTO tạo/cập nhật vai trò
 */
export interface CreateOrganizationRoleDto {
   name: string;
   description?: string;
   permission_ids: string[];
}

export interface UpdateOrganizationRoleDto {
   name?: string;
   description?: string;
   permission_ids?: string[];
}