import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export type GlobalNotificationType = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface GlobalNotification {
    id: string;
    title: string;
    content: string;
    type: GlobalNotificationType;
    starts_at?: string;
    ends_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    created_by?: string;
}

export interface CreateGlobalNotificationDto {
    title: string;
    content: string;
    type: GlobalNotificationType;
    starts_at?: string;
    ends_at?: string;
    is_active?: boolean;
}

export interface UpdateGlobalNotificationDto {
    title?: string;
    content?: string;
    type?: GlobalNotificationType;
    starts_at?: string;
    ends_at?: string;
    is_active?: boolean;
}

export interface QueryGlobalNotificationParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
    type?: GlobalNotificationType;
}

/**
 * Service quản lý thông báo toàn cầu (Global Notifications)
 */
export class GlobalNotificationService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách thông báo toàn cầu (public) */
    async findMany(query?: QueryGlobalNotificationParams): Promise<PaginatedResponse<GlobalNotification>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));
        if (query?.type) params.append('type', query.type);

        const response = await fetch(`${API}/global-notifications?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách thông báo');
        }

        return response.json();
    }

    /** Lấy danh sách thông báo đang active (public) */
    async getActiveNotifications(): Promise<ApiResponse<GlobalNotification[]>> {
        const response = await fetch(`${API}/global-notifications/active`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông báo đang active');
        }

        return response.json();
    }

    /** Lấy chi tiết thông báo toàn cầu (public) */
    async findById(id: string): Promise<ApiResponse<GlobalNotification>> {
        const response = await fetch(`${API}/global-notifications/${id}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết thông báo');
        }

        return response.json();
    }

    /** Tạo thông báo toàn cầu mới (Admin) */
    async create(token: string, dto: CreateGlobalNotificationDto): Promise<ApiResponse<GlobalNotification>> {
        const response = await fetch(`${API}/global-notifications`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo thông báo');
        }

        return response.json();
    }

    /** Cập nhật thông báo toàn cầu (Admin) */
    async update(token: string, id: string, dto: UpdateGlobalNotificationDto): Promise<ApiResponse<GlobalNotification>> {
        const response = await fetch(`${API}/global-notifications/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật thông báo');
        }

        return response.json();
    }

    /** Xóa thông báo toàn cầu (Admin) */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/global-notifications/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa thông báo');
        }

        return response.json();
    }

    /** Xóa nhiều thông báo toàn cầu (Admin) */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/global-notifications/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa nhiều thông báo');
        }

        return response.json();
    }
}

export const globalNotificationService = new GlobalNotificationService();
