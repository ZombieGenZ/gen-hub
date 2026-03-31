import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface Rank {
    id: string;
    name: string;
    description?: string;
    is_default: boolean;
    min_loyalty_points: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface CreateRankDto {
    name: string;
    description?: string;
    is_default?: boolean;
    min_loyalty_points: number;
    is_active?: boolean;
}

export interface UpdateRankDto {
    name?: string;
    description?: string;
    is_default?: boolean;
    min_loyalty_points?: number;
    is_active?: boolean;
}

export interface QueryRankParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}

/**
 * Service quản lý hạng thành viên (Rank/Loyalty)
 */
export class RankService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo hạng thành viên mới */
    async create(token: string, dto: CreateRankDto): Promise<ApiResponse<Rank>> {
        const response = await fetch(`${API}/ranks`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo hạng thành viên');
        }

        return response.json();
    }

    /** Lấy danh sách hạng thành viên */
    async findMany(token: string, query?: QueryRankParams): Promise<PaginatedResponse<Rank>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const response = await fetch(`${API}/ranks?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách hạng');
        }

        return response.json();
    }

    /** Lấy danh sách hạng đang hoạt động (public) */
    async findAllActive(query?: QueryRankParams): Promise<PaginatedResponse<Rank>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);

        const response = await fetch(`${API}/ranks/active?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách hạng active');
        }

        return response.json();
    }

    /** Lấy chi tiết hạng thành viên */
    async findById(token: string, id: string): Promise<ApiResponse<Rank>> {
        const response = await fetch(`${API}/ranks/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết hạng');
        }

        return response.json();
    }

    /** Cập nhật hạng thành viên */
    async update(token: string, id: string, dto: UpdateRankDto): Promise<ApiResponse<Rank>> {
        const response = await fetch(`${API}/ranks/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật hạng');
        }

        return response.json();
    }

    /** Xóa hạng thành viên */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/ranks/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa hạng');
        }

        return response.json();
    }

    /** Xóa nhiều hạng thành viên */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/ranks/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa nhiều hạng');
        }

        return response.json();
    }
}

export const rankService = new RankService();
