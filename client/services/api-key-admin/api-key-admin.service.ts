import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface ApiKey {
    id: string;
    name: string;
    key_preview: string;
    is_active: boolean;
    rate_limit_ttl?: number;
    rate_limit_max?: number;
    allowed_origins?: string[];
    organization_id?: string;
    organization?: {
        id: string;
        name: string;
    };
    created_at: string;
    updated_at?: string;
}

export interface ApiKeyDetail extends ApiKey {
    description?: string;
}

export interface QueryAdminApiKeyParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
    organization_id?: string;
}

export interface UpdateAdminApiKeyDto {
    name?: string;
    description?: string;
    is_active?: boolean;
    rate_limit_ttl?: number;
    rate_limit_max?: number;
    allowed_origins?: string[];
}

/**
 * Service quản lý API Keys cho Admin (toàn hệ thống)
 */
export class ApiKeyAdminService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách tất cả API keys (Admin) */
    async findMany(token: string, query?: QueryAdminApiKeyParams): Promise<PaginatedResponse<ApiKey>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));
        if (query?.organization_id) params.append('organization_id', query.organization_id);

        const response = await fetch(`${API}/admin/api-keys?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách API keys');
        }

        return response.json();
    }

    /** Xem chi tiết API key (Admin) */
    async findOne(token: string, id: string): Promise<ApiResponse<ApiKeyDetail>> {
        const response = await fetch(`${API}/admin/api-keys/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết API key');
        }

        return response.json();
    }

    /** Cập nhật API key (Admin) */
    async update(token: string, id: string, dto: UpdateAdminApiKeyDto): Promise<ApiResponse<ApiKey>> {
        const response = await fetch(`${API}/admin/api-keys/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật API key');
        }

        return response.json();
    }

    /** Xóa API key (Admin) */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/admin/api-keys/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa API key');
        }

        return response.json();
    }

    /** Xóa nhiều API keys (Admin) */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/admin/api-keys/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa nhiều API keys');
        }

        return response.json();
    }
}

export const apiKeyAdminService = new ApiKeyAdminService();
