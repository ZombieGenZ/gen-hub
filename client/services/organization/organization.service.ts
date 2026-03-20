import { OrganizationCreateRequest } from '../../types/organization/organization.type';
import { OrganizationPermission } from '../../types/organization/organization_role.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class OrganizationService {

    /**
     * Lấy danh sách tổ chức
     */
    async getOrganizations(token: string, params: {
        keywords?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
    } = {}) {
        const query = new URLSearchParams();

        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));

        const response = await fetch(`${API}/organizations?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách tổ chức');
        }

        const res = await response.json();
        return res.data; 
    }

    /**
     * Lấy thông tin organization theo ID
     */
    async getOrganizationById(token: string, id: string) {
        const response = await fetch(`${API}/organizations/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if(!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin tổ chức');
        }
        const res = await response.json();
        return res.data; 
    }

    /**
     * Tạo tổ chức mới
     */
    async createOrganization(token: string, data: OrganizationCreateRequest) {
        const response = await fetch(`${API}/organizations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo tổ chức mới');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật thông tin tổ chức (Gửi yêu cầu)
     */
    async updateOrganization(token: string, id: string, data: Partial<OrganizationCreateRequest>) {
        const response = await fetch(`${API}/organizations/${id}/update-request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gửi yêu cầu cập nhật tổ chức');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Kiểm tra mã số thuế
     */
    async checkTaxCodeExists(taxCode: string): Promise<{ exists: boolean; organization_name?: string }> {
        const response = await fetch(`${API}/public/organizations/check-tax-code?tax_code=${encodeURIComponent(taxCode)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return { exists: false };
        }

        const res = await response.json();
        return res.data || res; // Một số API public có thể không bọc data
    }

    /**
     * Xóa một tổ chức
     */
    async deleteOrganization(token: string, id: string) {
        const response = await fetch(`${API}/organizations/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa tổ chức');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách quyền của tổ chức
     */
    async getPermissions(token: string, orgId: string): Promise<OrganizationPermission[]> {
        const response = await fetch(`${API}/organizations/${orgId}/permissions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách quyền');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách permissions cho phép API key
     */
    async getApiKeyEnabledPermissions(token: string): Promise<OrganizationPermission[]> {
        const response = await fetch(`${API}/organizations/permissions/api-key-enabled`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách quyền API');
        }

        const res = await response.json();
        return res.data;
    }
}

export const organizationService = new OrganizationService();
