import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

export interface UserNotification {
    id: string;
    user_id: string;
    title: string;
    content: string;
    type: NotificationType;
    is_read: boolean;
    read_at?: string;
    created_at: string;
    data?: Record<string, any>;
}

export interface QueryUserNotificationParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_read?: boolean;
    type?: NotificationType;
}

export interface SendUserNotificationDto {
    user_id: string;
    title: string;
    content: string;
    type: NotificationType;
    data?: Record<string, any>;
}

export interface SendBulkUserNotificationDto {
    user_ids: string[];
    title: string;
    content: string;
    type: NotificationType;
    data?: Record<string, any>;
}

/**
 * Service quản lý thông báo người dùng
 */
export class UserNotificationService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Lấy danh sách thông báo của user hiện tại */
    async getMyNotifications(token: string, query?: QueryUserNotificationParams): Promise<PaginatedResponse<UserNotification>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_read != null) params.append('is_read', String(query.is_read));
        if (query?.type) params.append('type', query.type);

        const response = await fetch(`${API}/user-notifications?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách thông báo');
        }

        return response.json();
    }

    /** Đếm số thông báo chưa đọc */
    async countUnread(token: string): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/user-notifications/unread-count`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể đếm thông báo chưa đọc');
        }

        return response.json();
    }

    /** Lấy danh sách thông báo của user bất kỳ (Admin) */
    async getNotificationsByUserId(token: string, userId: string, query?: QueryUserNotificationParams): Promise<PaginatedResponse<UserNotification>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.is_read != null) params.append('is_read', String(query.is_read));
        if (query?.type) params.append('type', query.type);

        const response = await fetch(`${API}/user-notifications/user/${userId}?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông báo của user');
        }

        return response.json();
    }

    /** Gửi thông báo cho user (Admin) */
    async sendNotification(token: string, dto: SendUserNotificationDto): Promise<ApiResponse<UserNotification>> {
        const response = await fetch(`${API}/user-notifications/send`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gửi thông báo');
        }

        return response.json();
    }

    /** Đánh dấu thông báo đã đọc */
    async markAsRead(token: string, notificationId: string): Promise<ApiResponse<UserNotification>> {
        const response = await fetch(`${API}/user-notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể đánh dấu đã đọc');
        }

        return response.json();
    }

    /** Đánh dấu tất cả thông báo đã đọc */
    async markAllAsRead(token: string): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/user-notifications/read-all`, {
            method: 'PUT',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể đánh dấu tất cả đã đọc');
        }

        return response.json();
    }

    /** Gửi thông báo hàng loạt (Admin) */
    async sendBulkNotification(token: string, dto: SendBulkUserNotificationDto): Promise<ApiResponse<{ count: number }>> {
        const response = await fetch(`${API}/user-notifications/send-bulk`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gửi thông báo hàng loạt');
        }

        return response.json();
    }
}

export const userNotificationService = new UserNotificationService();
