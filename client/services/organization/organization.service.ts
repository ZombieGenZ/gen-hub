import { OrganizationCreateRequest } from '../../types/organization/organization.type';
import { OrganizationPermission } from '../../types/organization/organization_role.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class OrganizationService {

    /**
     * Lấy danh sách tổ chức với các tham số lọc
     * @param token 
     * @param params 
     * @returns 
     */
    async getOrganizations(token: string, params: {
        keywords?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
    } = {}) {
        try {
            console.log("[OrganizationService] Fetching organizations with params:", params);
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
                console.error("[OrganizationService] Failed to fetch organizations:", errorData);
                throw new Error(errorData.message || 'Failed to fetch organizations');
            }

            const data = await response.json();
            return data.data; 
        }
        catch(err) {
            console.error("[OrganizationService] Error in getOrganizations:", err);
            throw err;
        }
    }

    /**
     * Lấy thông tin organization theo ID
     * @param token 
     * @param id 
     * @returns 
     */
    async getOrganizationById(token: string, id: string) {
        try {
            console.log(`[OrganizationService] Fetching organization by id: ${id}`);
            const response = await fetch(`${API}/organizations/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[OrganizationService] Failed to fetch organization ${id}:`, errorData);
                throw new Error(errorData.message || 'Failed to fetch organization by id');
            }
            const data = await response.json();
            return data.data; 
        }
        catch(err) {
            console.error(`[OrganizationService] Error in getOrganizationById for ${id}:`, err);
            throw err;
        }
    }

    /**
     * Tạo tổ chức mới
     * @param token 
     * @param data 
     * @returns 
     */
    async createOrganization(token: string, data: OrganizationCreateRequest) {
        try {
            console.log("[OrganizationService] Creating organization:", data);
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
                console.error("[OrganizationService] Failed to create organization:", errorData);
                throw new Error(errorData.message || 'Không thể tạo tổ chức');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("[OrganizationService] Error in createOrganization:", err);
            throw err;
        }
    }

    /**
     * Cập nhật thông tin tổ chức
     * @param token 
     * @param id 
     * @param data 
     * @returns 
     */
    async updateOrganization(token: string, id: string, data: Partial<OrganizationCreateRequest>) {
        try {
            console.log(`[OrganizationService] Requesting update for organization: ${id}`, data);
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
                console.error(`[OrganizationService] Failed to update organization ${id}:`, errorData);
                throw new Error(errorData.message || 'Không thể cập nhật tổ chức');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error(`[OrganizationService] Error in updateOrganization for ${id}:`, err);
            throw err;
        }
    }

    /**
     * Kiểm tra mã số thuế đã tồn tại trong hệ thống chưa
     * @param taxCode Mã số thuế
     * @returns Kết quả kiểm tra
     */
    async checkTaxCodeExists(taxCode: string): Promise<{ exists: boolean; organization_name?: string }> {
        try {
            const response = await fetch(`${API}/public/organizations/check-tax-code?tax_code=${encodeURIComponent(taxCode)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                // Nếu API lỗi, trả về false để không block user
                return { exists: false };
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi kiểm tra mã số thuế:", err);
            return { exists: false };
        }
    }

    /**
     * Xóa một tổ chức
     * @param token 
     * @param id ID tổ chức
     * @returns 
     */
    async deleteOrganization(token: string, id: string) {
        try {
            console.log(`[OrganizationService] Deleting organization: ${id}`);
            const response = await fetch(`${API}/organizations/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[OrganizationService] Failed to delete organization ${id}:`, errorData);
                throw new Error(errorData.message || 'Không thể xóa tổ chức');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error(`[OrganizationService] Error in deleteOrganization for ${id}:`, err);
            throw err;
        }
    }

    /**
     * Xóa nhiều tổ chức cùng lúc
     * @param token 
     * @param ids Danh sách ID tổ chức
     * @returns 
     */
    async deleteMany(token: string, ids: string[]) {
        try {
            console.log(`[OrganizationService] Deleting multiple organizations:`, ids);
            const response = await fetch(`${API}/organizations/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[OrganizationService] Failed to delete organizations:`, errorData);
                throw new Error(errorData.message || 'Không thể xóa tổ chức');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error(`[OrganizationService] Error in deleteMany:`, err);
            throw err;
        }
    }

    /**
     * Lấy danh sách quyền của tổ chức
     * @param token 
     * @param orgId ID tổ chức
     * @returns Danh sách permissions
     */
    async getPermissions(token: string, orgId: string): Promise<OrganizationPermission[]> {
        try {
            console.log(`[OrganizationService] Fetching permissions for org: ${orgId}`);
            const response = await fetch(`${API}/organizations/${orgId}/permissions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[OrganizationService] Failed to fetch permissions for org ${orgId}:`, errorData);
                throw new Error(errorData.message || 'Không thể lấy danh sách quyền');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            console.error(`[OrganizationService] Error in getPermissions for ${orgId}:`, err);
            throw err;
        }
    }

    /**
     * Lấy danh sách permissions cho phép API key (public)
     * @returns Danh sách permissions hỗ trợ API key
     */
    async getApiKeyEnabledPermissions(token: string): Promise<OrganizationPermission[]> {
        try {
            console.log(`[OrganizationService] Fetching API key enabled permissions`);
            const response = await fetch(`${API}/organizations/permissions/api-key-enabled`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[OrganizationService] Failed to fetch API key enabled permissions:`, errorData);
                throw new Error(errorData.message || 'Không thể lấy danh sách permissions');
            }

            const data = await response.json();
            return data.data;
        } catch (err) {
            console.error(`[OrganizationService] Error in getApiKeyEnabledPermissions:`, err);
            throw err;
        }
    }
}

export const organizationService = new OrganizationService();