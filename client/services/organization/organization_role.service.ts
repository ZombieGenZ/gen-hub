import {
   OrganizationRole,
   OrganizationRolesResponse,
   OrganizationPermission,
   CreateOrganizationRoleDto,
   UpdateOrganizationRoleDto,
} from '@/types/organization/organization_role.type'

const API = process.env.NEXT_PUBLIC_API_URL

export class OrganizationRoleService {
   private normalizeRoleList(data: unknown): OrganizationRolesResponse {
      if (Array.isArray(data)) {
         return {
            items: data as OrganizationRole[],
            total: data.length,
            limit: data.length,
            offset: 0,
         };
      }

      const payload = (data || {}) as Partial<OrganizationRolesResponse>;
      return {
         items: Array.isArray(payload.items) ? payload.items : [],
         total: payload.total ?? (Array.isArray(payload.items) ? payload.items.length : 0),
         limit: payload.limit ?? (Array.isArray(payload.items) ? payload.items.length : 0),
         offset: payload.offset ?? 0,
      };
   }
   
   /**
    * Lấy thông tin vai trò của tổ chức (legacy)
    */
   async getOrganizationRole(access_token: string, organization_id: string) {
      const response = await fetch(`${API}/organizations/${organization_id}`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
         }
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Failed to get organization role');
      }

      const data = await response.json();
      return this.normalizeRoleList(data.data);
   }

   async getPermissions(
      token: string,
      orgId: string
   ): Promise<OrganizationPermission[]> {
      const response = await fetch(`${API}/organizations/${orgId}/roles/permissions`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'KhĂ´ng thá»ƒ láº¥y danh sĂ¡ch quyá»n');
      }

      const data = await response.json();
      return Array.isArray(data.data) ? data.data : [];
   }

   /**
    * Lấy danh sách vai trò trong tổ chức
    */
   async getRoles(
      token: string,
      orgId: string,
      params: { limit?: number; offset?: number; keyword?: string } = {}
   ): Promise<OrganizationRolesResponse> {
      const query = new URLSearchParams();
      if (params.limit) query.append('limit', String(params.limit));
      if (params.offset !== undefined) query.append('offset', String(params.offset));
      if (params.keyword) query.append('keyword', params.keyword);

      const response = await fetch(`${API}/organizations/${orgId}/roles?${query.toString()}`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Không thể lấy danh sách vai trò');
      }

      const data = await response.json();
      return this.normalizeRoleList(data.data);
   }

   /**
    * Lấy chi tiết vai trò
    */
   async getRoleById(
      token: string,
      orgId: string,
      roleId: string
   ): Promise<OrganizationRole> {
      const response = await fetch(`${API}/organizations/${orgId}/roles/${roleId}`, {
         method: 'GET',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Không thể lấy chi tiết vai trò');
      }

      const data = await response.json();
      return data.data;
   }

   /**
    * Tạo vai trò mới
    */
   async createRole(
      token: string,
      orgId: string,
      dto: CreateOrganizationRoleDto
   ): Promise<OrganizationRole> {
      const response = await fetch(`${API}/organizations/${orgId}/roles`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(dto),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Không thể tạo vai trò');
      }

      const data = await response.json();
      return data.data;
   }

   /**
    * Cập nhật vai trò
    */
   async updateRole(
      token: string,
      orgId: string,
      roleId: string,
      dto: UpdateOrganizationRoleDto
   ): Promise<OrganizationRole> {
      const response = await fetch(`${API}/organizations/${orgId}/roles/${roleId}`, {
         method: 'PUT',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(dto),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Không thể cập nhật vai trò');
      }

      const data = await response.json();
      return data.data;
   }

   /**
    * Xóa vai trò
    */
   async deleteRole(
      token: string,
      orgId: string,
      roleId: string
   ): Promise<void> {
      const response = await fetch(`${API}/organizations/${orgId}/roles/${roleId}`, {
         method: 'DELETE',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Không thể xóa vai trò');
      }
   }

   /**
    * Xóa nhiều vai trò
    */
   async deleteMany(
      token: string,
      orgId: string,
      roleIds: string[]
   ): Promise<void> {
      const response = await fetch(`${API}/organizations/${orgId}/roles/delete/many`, {
         method: 'POST',
         headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
         },
         body: JSON.stringify({ ids: roleIds }),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData.message || 'Không thể xóa vai trò');
      }
   }
}

export const organizationRoleService = new OrganizationRoleService();
