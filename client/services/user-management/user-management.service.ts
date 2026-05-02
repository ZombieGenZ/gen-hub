import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface User {
    id: string;
    email: string;
    name?: string;
    full_name?: string;
    phone?: string;
    is_banned: boolean;
    is_verified: boolean;
    warning_count: number;
    created_at: string;
    updated_at?: string;
    roles?: Array<{ id: string; name: string }>;
    permissions?: Array<{ id: string; key: string }>;
}

export interface UserStats {
    total: number;
    online: number;
    active: number;
    warned: number;
    banned: number;
}

export interface Warning {
    id: string;
    reason: string;
    status: string;
    is_permanent: boolean;
    expires_at?: string;
    created_at: string;
}

export interface Session {
    id: string;
    device_name: string;
    ip_address: string;
    last_active_at: string;
    is_current: boolean;
}

export interface QueryUsersParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: 'active' | 'banned' | 'verified' | 'unverified';
}

export interface BanUserDto {
    reason: string;
    is_permanent: boolean;
    duration_value?: number;
    duration_type?: 'HOURS' | 'DAYS';
}

export interface UnbanUserDto {
    note?: string;
}

export interface WarnUserDto {
    category_id: string;
    reason: string;
    is_permanent: boolean;
    duration_value?: number;
    duration_type?: 'HOURS' | 'DAYS';
}

export interface UnwarnUserDto {
    note?: string;
}

export interface QueryWarningsParams {
    limit?: number;
    offset?: number;
    status?: 'active' | 'removed' | 'expired';
}

export interface QuerySessionsParams {
    limit?: number;
    offset?: number;
}

export interface AssignRolesPermissionsDto {
    role_ids?: string[];
    permission_ids?: string[];
}

export interface BulkActionDto {
    user_ids: string[];
    reason?: string;
}

export interface DownloadUsersParams {
    keywords?: string;
    status?: 'active' | 'banned' | 'verified' | 'unverified' | 'deleted';
}

/**
 * Service quản lý người dùng (Admin)
 */
export class UserManagementService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách users */
    async findMany(token: string, query?: QueryUsersParams): Promise<PaginatedResponse<User>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.status) params.append('status', query.status);

        const response = await fetch(`${API}/admin/users?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách users');
        }

        return response.json();
    }

    /** Lấy thống kê users */
    async getStats(token: string): Promise<ApiResponse<UserStats>> {
        const response = await fetch(`${API}/admin/users/stats`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thống kê users');
        }

        return response.json();
    }

    /** Export dữ liệu tất cả users */
    async downloadAllUsersData(token: string, query?: DownloadUsersParams): Promise<ApiResponse<{ data: User[]; count: number; filename: string }>> {
        const params = new URLSearchParams();
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.status) params.append('status', query.status);

        const response = await fetch(`${API}/admin/users/download/all?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tải dữ liệu users');
        }

        return response.json();
    }

    /** Lấy chi tiết user */
    async findById(token: string, id: string): Promise<ApiResponse<User>> {
        const response = await fetch(`${API}/admin/users/${id}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin user');
        }

        return response.json();
    }

    /** Khóa user */
    async banUser(token: string, id: string, dto: BanUserDto): Promise<ApiResponse<User>> {
        const response = await fetch(`${API}/admin/users/${id}/ban`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể khóa user');
        }

        return response.json();
    }

    /** Mở khóa user */
    async unbanUser(token: string, id: string, dto?: UnbanUserDto): Promise<ApiResponse<User>> {
        const response = await fetch(`${API}/admin/users/${id}/unban`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto || {}),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể mở khóa user');
        }

        return response.json();
    }

    /** Lấy danh sách cảnh cáo của user */
    async findUserWarnings(token: string, id: string, query?: QueryWarningsParams): Promise<PaginatedResponse<Warning>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.status) params.append('status', query.status);

        const response = await fetch(`${API}/admin/users/${id}/warnings?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách cảnh cáo');
        }

        return response.json();
    }

    /** Cảnh cáo user */
    async warnUser(token: string, id: string, dto: WarnUserDto): Promise<ApiResponse<Warning>> {
        const response = await fetch(`${API}/admin/users/${id}/warn`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cảnh cáo user');
        }

        return response.json();
    }

    /** Gỡ cảnh cáo user */
    async unwarnUser(token: string, userId: string, warningId: string, dto?: UnwarnUserDto): Promise<ApiResponse<{ success: boolean }>> {
        const response = await fetch(`${API}/admin/users/${userId}/unwarn/${warningId}`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto || {}),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gỡ cảnh cáo');
        }

        return response.json();
    }

    /** Lấy danh sách sessions của user */
    async findUserSessions(token: string, id: string, query?: QuerySessionsParams): Promise<PaginatedResponse<Session>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));

        const response = await fetch(`${API}/admin/users/${id}/sessions?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách sessions');
        }

        return response.json();
    }

    /** Thu hồi một session */
    async revokeSession(token: string, userId: string, sessionId: string): Promise<ApiResponse<{ success: boolean }>> {
        const response = await fetch(`${API}/admin/users/${userId}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể thu hồi session');
        }

        return response.json();
    }

    /** Thu hồi tất cả sessions */
    async revokeAllSessions(token: string, userId: string): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/users/${userId}/sessions`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể thu hồi sessions');
        }

        return response.json();
    }

    /** Lấy roles và permissions của user */
    async getUserRolesAndPermissions(token: string, id: string): Promise<ApiResponse<{ roles: Array<{ id: string; name: string }>; permissions: Array<{ id: string; key: string }> }>> {
        const response = await fetch(`${API}/admin/users/${id}/roles-permissions`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy roles/permissions');
        }

        return response.json();
    }

    /** Gán roles và permissions cho user */
    async assignUserRolesAndPermissions(token: string, id: string, dto: AssignRolesPermissionsDto): Promise<ApiResponse<{ roles: Array<{ id: string; name: string }>; permissions: Array<{ id: string; key: string }> }>> {
        const response = await fetch(`${API}/admin/users/${id}/roles-permissions`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gán roles/permissions');
        }

        return response.json();
    }

    /** Khóa nhiều users */
    async bulkBan(token: string, dto: BulkActionDto): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/users/bulk/ban`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể khóa nhiều users');
        }

        return response.json();
    }

    /** Mở khóa nhiều users */
    async bulkUnban(token: string, dto: BulkActionDto): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/users/bulk/unban`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể mở khóa nhiều users');
        }

        return response.json();
    }

    /** Cảnh cáo nhiều users */
    async bulkWarn(token: string, dto: BulkActionDto & { category_id: string }): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/users/bulk/warn`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cảnh cáo nhiều users');
        }

        return response.json();
    }

    /** Xóa cảnh cáo nhiều users */
    async bulkClearAllWarnings(token: string, dto: BulkActionDto): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/admin/users/bulk/clear-warnings`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa cảnh cáo nhiều users');
        }

        return response.json();
    }
}

export const userManagementService = new UserManagementService();
