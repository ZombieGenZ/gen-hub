const API = process.env.NEXT_PUBLIC_API_URL;

export class UserService {
    /**
     * Lấy thông tin người dùng hiện tại
     */
    async getUser(accessToken: string, refreshToken: string) {
        const response = await fetch(`${API}/account/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin người dùng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Tìm kiếm người dùng (Admin)
     */
    async searchUsers(token: string, search: string) {
        const query = new URLSearchParams();
        if (search) query.append('search', search);

        const response = await fetch(`${API}/users?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tìm kiếm người dùng');
        }

        const res = await response.json();
        return res.data;
    }
}

export const userService = new UserService();
