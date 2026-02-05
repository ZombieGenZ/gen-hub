import { 
    UserNotification, 
    NotificationResponse, 
    GlobalNotificationResponse,
    UnreadCountResponse, 
    NotificationQueryParams,
    SendNotificationRequest,
    SendBulkNotificationRequest 
} from '@/types/notification/notification.type';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class NotificationService {

    /**
     * Lấy danh sách thông báo người dùng
     */
    async getNotifications(
        access_token: string, 
        params?: NotificationQueryParams
    ): Promise<NotificationResponse> {
        try {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.offset) searchParams.append('offset', params.offset.toString());
            if (params?.keywords) searchParams.append('keywords', params.keywords);
            if (params?.is_read !== undefined) searchParams.append('is_read', params.is_read.toString());
            if (params?.type) searchParams.append('type', params.type);

            const queryString = searchParams.toString();
            const url = `${API_URL}/user-notifications${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch notifications');
            }
            const data = await response.json();
            return data.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * Đếm số thông báo chưa đọc
     */
    async getUnreadCount(access_token: string): Promise<number> {
        try {
            const response = await fetch(`${API_URL}/user-notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch unread count');
            }
            const data = await response.json();
            return data.data.count;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * Đánh dấu một thông báo là đã đọc
     */
    async markAsRead(access_token: string, notificationId: string): Promise<UserNotification> {
        try {
            const response = await fetch(`${API_URL}/user-notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to mark as read');
            }
            const data = await response.json();
            return data.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * Đánh dấu tất cả thông báo là đã đọc
     */
    async markAllAsRead(access_token: string): Promise<number> {
        try {
            const response = await fetch(`${API_URL}/user-notifications/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to mark all as read');
            }
            const data = await response.json();
            return data.data.count;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * [Admin] Gửi thông báo cho một user
     */
    async sendNotification(
        access_token: string, 
        data: SendNotificationRequest
    ): Promise<UserNotification> {
        try {
            const response = await fetch(`${API_URL}/user-notifications/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to send notification');
            }
            const responseData = await response.json();
            return responseData.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * [Admin] Gửi thông báo hàng loạt
     */
    async sendBulkNotification(
        access_token: string, 
        data: SendBulkNotificationRequest
    ): Promise<{ count: number }> {
        try {
            const response = await fetch(`${API_URL}/user-notifications/send-bulk`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to send bulk notification');
            }
            const responseData = await response.json();
            return responseData.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * [Admin] Lấy thông báo của user bất kỳ
     */
    async getUserNotifications(
        access_token: string, 
        userId: string,
        params?: NotificationQueryParams
    ): Promise<NotificationResponse> {
        try {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.offset) searchParams.append('offset', params.offset.toString());
            if (params?.keywords) searchParams.append('keywords', params.keywords);
            if (params?.is_read !== undefined) searchParams.append('is_read', params.is_read.toString());
            if (params?.type) searchParams.append('type', params.type);

            const queryString = searchParams.toString();
            const url = `${API_URL}/user-notifications/user/${userId}${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch user notifications');
            }
            const data = await response.json();
            return data.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * Lấy danh sách thông báo toàn hệ thống
     * @param access_token Token truy cập
     * @returns Danh sách thông báo toàn hệ thống
     */
    async getGlobalNotifications(
        access_token: string,
        params?: NotificationQueryParams
    ): Promise<GlobalNotificationResponse> {
        try {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.append('limit', params.limit.toString());
            if (params?.offset) searchParams.append('offset', params.offset.toString());
            if (params?.keywords) searchParams.append('keywords', params.keywords);
            if (params?.type) searchParams.append('type', params.type);

            const queryString = searchParams.toString();
            const url = `${API_URL}/global-notifications${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch global notifications');
            }
            
            const data = await response.json();
            return data.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * [Admin] Tạo thông báo toàn hệ thống
     */
    async createGlobalNotification(
        access_token: string,
        data: { title: string; content: string; type?: string; starts_at?: string }
    ): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/global-notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create global notification');
            }
            const responseData = await response.json();
            return responseData.data;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * [Admin] Xóa thông báo toàn hệ thống
     */
    async deleteGlobalNotification(
        access_token: string,
        id: string
    ): Promise<boolean> {
        try {
            const response = await fetch(`${API_URL}/global-notifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete global notification');
            }
            return true;
        }
        catch (error) {
            throw error;
        }
    }

    /**
     * [Admin] Xóa nhiều thông báo toàn hệ thống
     */
    async deleteMultipleGlobalNotifications(
        access_token: string,
        ids: string[]
    ): Promise<boolean> {
        try {
            const response = await fetch(`${API_URL}/global-notifications/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete multiple global notifications');
            }
            return true;
        } catch (error) {
            throw error;
        }
    }
}
