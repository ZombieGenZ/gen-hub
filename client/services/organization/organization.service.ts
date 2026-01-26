const API = process.env.NEXT_PUBLIC_API_URL;

export class OrganizationService {
    async getOrganizations(token: string, params: {
        keywords?: string;
        is_active?: boolean;
        page?: number;
        limit?: number;
    } = {}) {
        try {
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
                throw new Error(errorData.message || 'Failed to fetch organizations');
            }

            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch organizations", err);
        }
    }

    // Lấy thông tin organization theo ID
    async getOrganizationById(token: string, id: string) {
        try {
            const response = await fetch(`${API}/organizations/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch organization by id');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch organization by id", err);
        }
    }

    // Tạo tổ chức mới
    async createOrganization(token: string, data: {
        name: string;
        international_name?: string;
        tax_code: string;
        headquarters_address: string;
        invoice_address?: string;
        representative_name: string;
        representative_title?: string;
        representative_phone: string;
        representative_email: string;
    }) {
        try {
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
                throw new Error(errorData.message || 'Không thể tạo tổ chức');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi tạo tổ chức:", err);
            throw err;
        }
    }

    // Cập nhật thông tin tổ chức
    async updateOrganization(token: string, id: string, data: {
        name?: string;
        international_name?: string;
        tax_code?: string;
        headquarters_address?: string;
        invoice_address?: string;
        representative_name?: string;
        representative_title?: string;
        representative_phone?: string;
        representative_email?: string;
    }) {
        try {
            const response = await fetch(`${API}/organizations/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể cập nhật tổ chức');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error("Lỗi khi cập nhật tổ chức:", err);
            throw err;
        }
    }

    // Kiểm tra mã số thuế đã tồn tại trong hệ thống chưa
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
}