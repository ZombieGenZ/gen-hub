// ────────────────────────────────────────────────
// Organization Role Service
// Route: /organizations/:orgId/roles
// ────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

export interface OrgRole {
    id: string;
    name: string;
    description?: string;
    organization_id: string;
    member_count?: number;
    permissions?: { id: string; key: string; name: string }[];
    members?: { id: string; user: { id: string; email: string; full_name: string } }[];
    created_at: string;
    updated_at?: string;
}

export interface CreateOrgRoleDto {
    name: string;
    description?: string;
    permission_ids?: string[];
}

export interface UpdateOrgRoleDto {
    name?: string;
    description?: string;
    permission_ids?: string[];
}

export class OrgRoleService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Tạo vai trò mới trong tổ chức
     * POST /organizations/:orgId/roles
     */
    async create(token: string, orgId: string, data: CreateOrgRoleDto): Promise<OrgRole> {
        const response = await fetch(`${API}/organizations/${orgId}/roles`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo vai trò');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách vai trò của tổ chức
     * GET /organizations/:orgId/roles
     */
    async findMany(token: string, orgId: string): Promise<OrgRole[]> {
        const response = await fetch(`${API}/organizations/${orgId}/roles`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách vai trò');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết vai trò
     * GET /organizations/:orgId/roles/:roleId
     */
    async findById(token: string, orgId: string, roleId: string): Promise<OrgRole> {
        const response = await fetch(`${API}/organizations/${orgId}/roles/${roleId}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết vai trò');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật vai trò
     * PUT /organizations/:orgId/roles/:roleId
     */
    async update(token: string, orgId: string, roleId: string, data: UpdateOrgRoleDto): Promise<OrgRole> {
        const response = await fetch(`${API}/organizations/${orgId}/roles/${roleId}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật vai trò');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa vai trò
     * DELETE /organizations/:orgId/roles/:roleId
     */
    async delete(token: string, orgId: string, roleId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/roles/${roleId}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa vai trò');
        }
    }

    /**
     * Xóa nhiều vai trò
     * DELETE /organizations/:orgId/roles/delete/many
     */
    async deleteMany(token: string, orgId: string, ids: string[]): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/roles/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các vai trò đã chọn');
        }
    }
}

export const orgRoleService = new OrgRoleService();
