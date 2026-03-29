// ────────────────────────────────────────────────
// Organization API Key Service
// Route: /organizations/:orgId/api-keys
// ────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

export interface OrgApiKey {
    id: string;
    name: string;
    key?: string; // Chỉ hiển thị 1 lần sau khi tạo hoặc reset
    key_preview?: string;
    description?: string;
    is_active: boolean;
    expires_at?: string | null;
    allowed_origins?: string[];
    rate_limit_ttl?: number;
    rate_limit_max?: number;
    permissions?: { id: string; key: string; name: string }[];
    created_at: string;
    updated_at?: string;
}

export interface CreateApiKeyDto {
    name: string;
    description?: string;
    permission_ids?: string[];
    expires_at?: string;
    allowed_origins?: string[];
    rate_limit_ttl?: number;
    rate_limit_max?: number;
}

export interface UpdateApiKeyDto {
    name?: string;
    description?: string;
    is_active?: boolean;
    permission_ids?: string[];
    expires_at?: string;
    allowed_origins?: string[];
    rate_limit_ttl?: number;
    rate_limit_max?: number;
}

export class OrgApiKeyService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Tạo API key mới
     * POST /organizations/:orgId/api-keys
     */
    async create(token: string, orgId: string, data: CreateApiKeyDto): Promise<OrgApiKey> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo API key');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách API keys
     * GET /organizations/:orgId/api-keys
     */
    async findMany(token: string, orgId: string): Promise<OrgApiKey[]> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách API keys');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết API key
     * GET /organizations/:orgId/api-keys/:keyId
     */
    async findById(token: string, orgId: string, keyId: string): Promise<OrgApiKey> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys/${keyId}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết API key');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật API key
     * PUT /organizations/:orgId/api-keys/:keyId
     */
    async update(token: string, orgId: string, keyId: string, data: UpdateApiKeyDto): Promise<OrgApiKey> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys/${keyId}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật API key');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Reset API key (tạo lại giá trị key mới)
     * POST /organizations/:orgId/api-keys/:keyId/reset
     */
    async reset(token: string, orgId: string, keyId: string): Promise<OrgApiKey> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys/${keyId}/reset`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể reset API key');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa API key
     * DELETE /organizations/:orgId/api-keys/:keyId
     */
    async delete(token: string, orgId: string, keyId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys/${keyId}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa API key');
        }
    }

    /**
     * Xóa nhiều API keys
     * DELETE /organizations/:orgId/api-keys/delete/many
     */
    async deleteMany(token: string, orgId: string, ids: string[]): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/api-keys/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các API keys đã chọn');
        }
    }
}

export const orgApiKeyService = new OrgApiKeyService();
