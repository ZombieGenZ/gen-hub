import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export type DurationUnit = 'DAY' | 'HOUR';

export interface WarnPenalty {
    id: string;
    min_warn_count: number;
    max_warn_count?: number;
    is_permanent_ban: boolean;
    duration_value?: number;
    duration_unit?: DurationUnit;
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at?: string;
}

export interface CreateWarnPenaltyDto {
    min_warn_count: number;
    max_warn_count?: number;
    is_permanent_ban: boolean;
    duration_value?: number;
    duration_unit?: DurationUnit;
    description?: string;
}

export interface UpdateWarnPenaltyDto {
    min_warn_count?: number;
    max_warn_count?: number;
    is_permanent_ban?: boolean;
    duration_value?: number;
    duration_unit?: DurationUnit;
    description?: string;
    is_active?: boolean;
}

export interface QueryWarnPenaltyParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}

/**
 * Service quản lý quy tắc phạt warn (Admin)
 */
export class WarnPenaltyService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo quy tắc phạt warn mới */
    async create(token: string, dto: CreateWarnPenaltyDto): Promise<ApiResponse<WarnPenalty>> {
        const response = await fetch(`${API}/admin/warn-penalties`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo quy tắc phạt warn');
        }

        return response.json();
    }

    /** Lấy danh sách quy tắc phạt warn */
    async findMany(token: string, query?: QueryWarnPenaltyParams): Promise<PaginatedResponse<WarnPenalty>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const response = await fetch(`${API}/admin/warn-penalties?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách quy tắc phạt warn');
        }

        return response.json();
    }

    /** Lấy tất cả quy tắc phạt warn đang active */
    async findAllActive(token: string): Promise<ApiResponse<WarnPenalty[]>> {
        const response = await fetch(`${API}/admin/warn-penalties/active`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách quy tắc active');
        }

        return response.json();
    }

    /** Lấy chi tiết quy tắc phạt warn */
    async findById(token: string, id: string): Promise<ApiResponse<WarnPenalty>> {
        const response = await fetch(`${API}/admin/warn-penalties/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin quy tắc phạt warn');
        }

        return response.json();
    }

    /** Cập nhật quy tắc phạt warn */
    async update(token: string, id: string, dto: UpdateWarnPenaltyDto): Promise<ApiResponse<WarnPenalty>> {
        const response = await fetch(`${API}/admin/warn-penalties/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật quy tắc phạt warn');
        }

        return response.json();
    }

    /** Xóa quy tắc phạt warn */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/admin/warn-penalties/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa quy tắc phạt warn');
        }

        return response.json();
    }

    /** Xóa nhiều quy tắc phạt warn */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/warn-penalties`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các quy tắc phạt warn');
        }

        return response.json();
    }
}

export const warnPenaltyService = new WarnPenaltyService();
