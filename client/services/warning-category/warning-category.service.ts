import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface WarningCategory {
    id: string;
    name: string;
    description?: string;
    severity: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateWarningCategoryDto {
    name: string;
    description?: string;
    severity?: number;
}

export interface UpdateWarningCategoryDto {
    name?: string;
    description?: string;
    severity?: number;
    is_active?: boolean;
}

export interface QueryWarningCategoryParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: string;
    is_active?: boolean;
}

/**
 * Service quản lý danh mục cảnh báo (Admin)
 */
export class WarningCategoryService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo danh mục cảnh báo mới */
    async create(token: string, dto: CreateWarningCategoryDto): Promise<ApiResponse<WarningCategory>> {
        const response = await fetch(`${API}/admin/warning-categories`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo danh mục cảnh báo');
        }

        return response.json();
    }

    /** Lấy danh sách danh mục cảnh báo */
    async findMany(token: string, query?: QueryWarningCategoryParams): Promise<PaginatedResponse<WarningCategory>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.status) params.append('status', query.status);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const response = await fetch(`${API}/admin/warning-categories?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách danh mục cảnh báo');
        }

        return response.json();
    }

    /** Lấy tất cả danh mục active cho dropdown */
    async findAllActive(token: string): Promise<ApiResponse<WarningCategory[]>> {
        const response = await fetch(`${API}/admin/warning-categories/all`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách danh mục active');
        }

        return response.json();
    }

    /** Lấy chi tiết danh mục cảnh báo */
    async findById(token: string, id: string): Promise<ApiResponse<WarningCategory>> {
        const response = await fetch(`${API}/admin/warning-categories/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin danh mục cảnh báo');
        }

        return response.json();
    }

    /** Cập nhật danh mục cảnh báo */
    async update(token: string, id: string, dto: UpdateWarningCategoryDto): Promise<ApiResponse<WarningCategory>> {
        const response = await fetch(`${API}/admin/warning-categories/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật danh mục cảnh báo');
        }

        return response.json();
    }

    /** Xóa danh mục cảnh báo */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/admin/warning-categories/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa danh mục cảnh báo');
        }

        return response.json();
    }

    /** Xóa nhiều danh mục cảnh báo */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/warning-categories`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các danh mục cảnh báo');
        }

        return response.json();
    }
}

export const warningCategoryService = new WarningCategoryService();
