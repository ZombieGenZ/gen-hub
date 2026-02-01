
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class NotificationService {

    /**
     * Lấy danh sách thông báo người dùng
     * @param access_token Token truy cập
     * @returns Danh sách thông báo
     */
    async getNotifications(access_token: string) {
        try {
            const response = await fetch(`${API_URL}/user-notifications`, {
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
            console.log("Notifications Data:", data);
            return data.data.items;
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
    async globalNotification(access_token: string) {
        try {
            const response = await fetch(`${API_URL}/global-notifications`, {
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
            console.log("Global Notifications Data:", data);
            return data.data.items;
        }
        catch (error) {
            throw error;
        }
    }
}
