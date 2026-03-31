import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CustomerReview {
    id: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    customer_company?: string;
    customer_position?: string;
    customer_avatar?: string;
    rating: number;
    title?: string;
    content: string;
    reply?: string;
    replied_at?: string;
    replied_by?: string;
    status: ReviewStatus;
    is_featured: boolean;
    display_order: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    created_by?: string;
    updated_by?: string;
}

export interface CreateCustomerReviewDto {
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    customer_company?: string;
    customer_position?: string;
    customer_avatar?: string;
    rating: number;
    title?: string;
    content: string;
    reply?: string;
    status?: ReviewStatus;
    is_featured?: boolean;
    display_order?: number;
    is_active?: boolean;
}

export interface UpdateCustomerReviewDto {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_company?: string;
    customer_position?: string;
    customer_avatar?: string;
    rating?: number;
    title?: string;
    content?: string;
    reply?: string;
    status?: ReviewStatus;
    is_featured?: boolean;
    display_order?: number;
    is_active?: boolean;
}

export interface QueryCustomerReviewParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: ReviewStatus;
    rating?: number;
    is_featured?: boolean;
    is_active?: boolean;
}

/**
 * Service quản lý đánh giá khách hàng (Admin)
 */
export class CustomerReviewService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo đánh giá khách hàng */
    async create(token: string, dto: CreateCustomerReviewDto): Promise<ApiResponse<CustomerReview>> {
        const response = await fetch(`${API}/customer-reviews`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo đánh giá');
        }

        return response.json();
    }

    /** Lấy danh sách đánh giá */
    async findMany(token: string, query?: QueryCustomerReviewParams): Promise<PaginatedResponse<CustomerReview>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.status) params.append('status', query.status);
        if (query?.rating != null) params.append('rating', String(query.rating));
        if (query?.is_featured != null) params.append('is_featured', String(query.is_featured));
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const response = await fetch(`${API}/customer-reviews?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách đánh giá');
        }

        return response.json();
    }

    /** Lấy chi tiết đánh giá */
    async findById(token: string, id: string): Promise<ApiResponse<CustomerReview>> {
        const response = await fetch(`${API}/customer-reviews/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin đánh giá');
        }

        return response.json();
    }

    /** Cập nhật đánh giá */
    async update(token: string, id: string, dto: UpdateCustomerReviewDto): Promise<ApiResponse<CustomerReview>> {
        const response = await fetch(`${API}/customer-reviews/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật đánh giá');
        }

        return response.json();
    }

    /** Xóa đánh giá */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/customer-reviews/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa đánh giá');
        }

        return response.json();
    }

    /** Xóa nhiều đánh giá */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/customer-reviews/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các đánh giá');
        }

        return response.json();
    }
}

export const customerReviewService = new CustomerReviewService();
