import { 
    UserNotification, 
    NotificationResponse, 
    GlobalNotificationResponse,
    UnreadCountResponse, 
    NotificationQueryParams,
    SendNotificationRequest,
    SendBulkNotificationRequest, 
    GlobalNotification
} from '@/types/notification/notification.type';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Service quản lý các thao tác liên quan đến thông báo của người dùng
 * Bao gồm lấy danh sách, đánh dấu đã đọc, gửi thông báo và các thao tác khác
 */
export class NotificationService {
    /**
     * Lấy danh sách thông báo của người dùng hiện tại
     * @param {string} access_token - Token xác thực người dùng
     * @param {NotificationQueryParams} [params] - Tham số lọc và phân trang
     * @param {number} [params.limit] - Số lượng thông báo mỗi trang
     * @param {number} [params.offset] - Vị trí bắt đầu lấy dữ liệu
     * @param {string} [params.keywords] - Từ khóa tìm kiếm
     * @param {boolean} [params.is_read] - Lọc theo trạng thái đã đọc/chưa đọc
     * @param {string} [params.type] - Loại thông báo
     * @returns {Promise<NotificationResponse>} Danh sách thông báo và thông tin phân trang
     * @throws {Error} 
     *    - 401: Không có quyền truy cập
     *    - 500: Lỗi server
     * @example
     * // Lấy 10 thông báo đầu tiên chưa đọc
     * const notifications = await notificationService.getNotifications(token, {
     *   limit: 10,
     *   is_read: false
     * });
     */
    async getNotifications(
        access_token: string, 
        params?: NotificationQueryParams
    ): Promise<NotificationResponse> {
        try {
            console.log("[NotificationService] Fetching notifications with params:", params);
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
                console.error("[NotificationService] Failed to fetch notifications:", errorData);
                throw new Error(errorData.message || 'Failed to fetch notifications');
            }
            const data = await response.json();
            return data.data;
        }
        catch (error) {
            console.error("[NotificationService] Error in getNotifications:", error);
            throw error;
        }
    }

    /**
     * Đếm số lượng thông báo chưa đọc của người dùng hiện tại
     * @param {string} access_token - Token xác thực người dùng
     * @returns {Promise<number>} Số lượng thông báo chưa đọc
     * @throws {Error}
     *    - 401: Không có quyền truy cập
     *    - 500: Lỗi server
     * @example
     * const unreadCount = await notificationService.getUnreadCount(token);
     */
    async getUnreadCount(access_token: string): Promise<number> {
        try {
            console.log("[NotificationService] Fetching unread count...");
            const response = await fetch(`${API_URL}/user-notifications/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("[NotificationService] Failed to fetch unread count:", errorData);
                throw new Error(errorData.message || 'Failed to fetch unread count');
            }
            const data = await response.json();
            return data.data.count;
        }
        catch (error) {
            console.error("[NotificationService] Error in getUnreadCount:", error);
            throw error;
        }
    }

    /**
     * Đánh dấu một thông báo cụ thể là đã đọc
     * @param {string} access_token - Token xác thực người dùng
     * @param {string} notificationId - ID của thông báo cần đánh dấu
     * @returns {Promise<UserNotification>} Thông tin thông báo đã được cập nhật
     * @throws {Error}
     *    - 401: Không có quyền thực hiện
     *    - 404: Không tìm thấy thông báo
     *    - 500: Lỗi server
     * @example
     * await notificationService.markAsRead(token, 'notification-123');
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
     * Đánh dấu tất cả thông báo của người dùng là đã đọc
     * @param {string} access_token - Token xác thực người dùng
     * @returns {Promise<number>} Số lượng thông báo đã được đánh dấu
     * @throws {Error}
     *    - 401: Không có quyền thực hiện
     *    - 500: Lỗi server
     * @example
     * const updatedCount = await notificationService.markAllAsRead(token);
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
     * [Admin] Gửi thông báo đến một người dùng cụ thể
     * @param {string} access_token - Token xác thực quản trị viên
     * @param {SendNotificationRequest} data - Dữ liệu thông báo
     * @param {string} data.userId - ID người dùng nhận thông báo
     * @param {string} data.title - Tiêu đề thông báo
     * @param {string} data.content - Nội dung thông báo
     * @param {string} [data.type] - Loại thông báo (tùy chọn)
     * @param {object} [data.metadata] - Dữ liệu bổ sung (tùy chọn)
     * @returns {Promise<UserNotification>} Thông tin thông báo đã gửi
     * @throws {Error}
     *    - 400: Dữ liệu không hợp lệ
     *    - 401: Không có quyền thực hiện
     *    - 404: Không tìm thấy người dùng
     *    - 500: Lỗi server
     * @example
     * await notificationService.sendNotification(token, {
     *   userId: 'user-123',
     *   title: 'Thông báo quan trọng',
     *   content: 'Đây là nội dung thông báo',
     *   type: 'system'
     * });
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
     * [Admin] Gửi thông báo đến nhiều người dùng cùng lúc
     * @param {string} access_token - Token xác thực quản trị viên
     * @param {SendBulkNotificationRequest} data - Dữ liệu gửi hàng loạt
     * @param {string[]} data.userIds - Danh sách ID người dùng nhận thông báo
     * @param {string} data.title - Tiêu đề thông báo
     * @param {string} data.content - Nội dung thông báo
     * @param {string} [data.type] - Loại thông báo (tùy chọn)
     * @param {object} [data.metadata] - Dữ liệu bổ sung (tùy chọn)
     * @returns {Promise<{count: number}>} Số lượng thông báo đã gửi thành công
     * @throws {Error}
     *    - 400: Dữ liệu không hợp lệ
     *    - 401: Không có quyền thực hiện
     *    - 500: Lỗi server
     * @example
     * await notificationService.sendBulkNotification(token, {
     *   userIds: ['user-1', 'user-2', 'user-3'],
     *   title: 'Thông báo chung',
     *   content: 'Nội dung thông báo cho nhiều người',
     *   type: 'announcement'
     * });
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
     * [Admin] Lấy danh sách thông báo của một người dùng bất kỳ
     * @param {string} access_token - Token xác thực quản trị viên
     * @param {string} userId - ID của người dùng cần lấy thông báo
     * @param {NotificationQueryParams} [params] - Tham số lọc và phân trang
     * @param {number} [params.limit] - Số lượng thông báo mỗi trang
     * @param {number} [params.offset] - Vị trí bắt đầu lấy dữ liệu
     * @param {string} [params.keywords] - Từ khóa tìm kiếm
     * @param {boolean} [params.is_read] - Lọc theo trạng thái đã đọc/chưa đọc
     * @param {string} [params.type] - Loại thông báo
     * @returns {Promise<NotificationResponse>} Danh sách thông báo và thông tin phân trang
     * @throws {Error}
     *    - 401: Không có quyền thực hiện
     *    - 404: Không tìm thấy người dùng
     *    - 500: Lỗi server
     * @example
     * const notifications = await notificationService.getUserNotifications(
     *   adminToken,
     *   'user-123',
     *   { limit: 20, is_read: false }
     * );
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
     * @param access_token Token truy cập
     * @param data Dữ liệu thông báo
     * @returns Thông báo đã tạo
     */
    async createGlobalNotification(
        access_token: string,
        data: { title: string; content: string; type?: string; starts_at?: string }
    ): Promise<GlobalNotification> {
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
     * @param access_token Token truy cập
     * @param id ID thông báo
     * @returns Kết quả xóa
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
     * @param access_token Token truy cập
     * @param ids IDs thông báo
     * @returns Kết quả xóa
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
