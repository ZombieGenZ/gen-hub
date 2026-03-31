import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface Role {
    id: string;
    name: string;
    description?: string;
    is_system: boolean;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    permissions?: Array<{ id: string; key: string; name: string }>;
}

export interface CreateRoleDto {
    name: string;
    description?: string;
    is_default?: boolean;
    permission_ids?: string[];
}

export interface UpdateRoleDto {
    name?: string;
    description?: string;
    is_default?: boolean;
    is_active?: boolean;
    permission_ids?: string[];
}

export interface QueryRoleParams {
    limit?: number;
    offset?: number;
    keywords?: string;
}

/**
 * Service quản lý vai trò (Roles) hệ thống
 */
export class RoleService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Tạo role mới */
    async create(token: string, dto: CreateRoleDto): Promise<ApiResponse<Role>> {
        const response = await fetch(`${API}/roles`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo role');
        }

        return response.json();
    }

    /** Lấy danh sách roles */
    async findMany(token: string, query?: QueryRoleParams): Promise<PaginatedResponse<Role>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);

        const response = await fetch(`${API}/roles?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách roles');
        }

        return response.json();
    }

    /** Lấy chi tiết role (kèm permissions) */
    async findById(token: string, id: string): Promise<ApiResponse<Role>> {
        const response = await fetch(`${API}/roles/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin role');
        }

        return response.json();
    }

    /** Cập nhật role */
    async update(token: string, id: string, dto: UpdateRoleDto): Promise<ApiResponse<Role>> {
        const response = await fetch(`${API}/roles/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật role');
        }

        return response.json();
    }

    /** Xóa role */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/roles/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa role');
        }

        return response.json();
    }

    /** Xóa nhiều roles */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/roles/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các roles');
        }

        return response.json();
    }
}

export const roleService = new RoleService();
