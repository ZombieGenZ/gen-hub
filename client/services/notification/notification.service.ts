
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class NotificationService {

    async getNotifications(access_token: string) {
        try {
            const response = await fetch(`${API_URL}/user-notifications`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        } catch (error) {
            throw error;
        }
    }

    async globalNotification(access_token: string) {
        try {
            const response = await fetch(`${API_URL}/global-notifications`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        } catch (error) {
            throw error;
        }
    }
}
