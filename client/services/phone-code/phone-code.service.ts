import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface PhoneCode {
    id: string;
    code: string;
    country: string;
    country_code: string;
    flag?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreatePhoneCodeDto {
    code: string;
    country: string;
    country_code: string;
    flag?: string;
    is_active?: boolean;
}

export interface UpdatePhoneCodeDto {
    code?: string;
    country?: string;
    country_code?: string;
    flag?: string;
    is_active?: boolean;
}

export interface QueryPhoneCodeParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}

/**
 * Service quản lý mã vùng điện thoại (Phone Code)
 */
export class PhoneCodeService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo mã vùng điện thoại mới */
    async create(token: string, dto: CreatePhoneCodeDto): Promise<ApiResponse<PhoneCode>> {
        const response = await fetch(`${API}/phone-codes`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo mã vùng điện thoại');
        }

        return response.json();
    }

    /** Lấy danh sách mã vùng điện thoại */
    async findMany(token: string, query?: QueryPhoneCodeParams): Promise<PaginatedResponse<PhoneCode>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const response = await fetch(`${API}/phone-codes?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách mã vùng');
        }

        return response.json();
    }

    /** Lấy danh sách mã vùng đang hoạt động (public) */
    async findAllActive(query?: QueryPhoneCodeParams): Promise<PaginatedResponse<PhoneCode>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));

        const response = await fetch(`${API}/phone-codes/active?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách mã vùng active');
        }

        return response.json();
    }

    /** Lấy chi tiết mã vùng điện thoại */
    async findById(token: string, id: string): Promise<ApiResponse<PhoneCode>> {
        const response = await fetch(`${API}/phone-codes/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết mã vùng');
        }

        return response.json();
    }

    /** Cập nhật mã vùng điện thoại */
    async update(token: string, id: string, dto: UpdatePhoneCodeDto): Promise<ApiResponse<PhoneCode>> {
        const response = await fetch(`${API}/phone-codes/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật mã vùng');
        }

        return response.json();
    }

    /** Xóa mã vùng điện thoại */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/phone-codes/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa mã vùng');
        }

        return response.json();
    }

    /** Xóa nhiều mã vùng điện thoại */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/phone-codes/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa nhiều mã vùng');
        }

        return response.json();
    }
}

export const phoneCodeService = new PhoneCodeService();
