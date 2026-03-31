import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface FAQ {
    id: string;
    question: string;
    answer: string;
    order: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateFAQDto {
    question: string;
    answer: string;
    order?: number;
    is_active?: boolean;
}

export interface UpdateFAQDto {
    question?: string;
    answer?: string;
    order?: number;
    is_active?: boolean;
}

export interface QueryFAQParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}

/**
 * Service quản lý FAQ (Admin)
 */
export class FAQAdminService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo FAQ mới */
    async create(token: string, dto: CreateFAQDto): Promise<ApiResponse<FAQ>> {
        const response = await fetch(`${API}/faqs`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo FAQ');
        }

        return response.json();
    }

    /** Lấy danh sách FAQ (Admin) */
    async findMany(token: string, query?: QueryFAQParams): Promise<PaginatedResponse<FAQ>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const response = await fetch(`${API}/faqs?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách FAQ');
        }

        return response.json();
    }

    /** Lấy chi tiết FAQ */
    async findById(token: string, id: string): Promise<ApiResponse<FAQ>> {
        const response = await fetch(`${API}/faqs/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin FAQ');
        }

        return response.json();
    }

    /** Cập nhật FAQ */
    async update(token: string, id: string, dto: UpdateFAQDto): Promise<ApiResponse<FAQ>> {
        const response = await fetch(`${API}/faqs/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật FAQ');
        }

        return response.json();
    }

    /** Xóa FAQ */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/faqs/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa FAQ');
        }

        return response.json();
    }

    /** Xóa nhiều FAQ */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/faqs/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các FAQ');
        }

        return response.json();
    }
}

export const faqAdminService = new FAQAdminService();
