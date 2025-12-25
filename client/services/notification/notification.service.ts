
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class NotificationService {

    async getNotifications(access_token: string) {
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
        
        return response.json();
    }

    async globalNotification(access_token: string) {
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
        
        return response.json();
    }
}
