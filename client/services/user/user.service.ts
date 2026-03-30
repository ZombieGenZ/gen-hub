import type { Enable2FAResponse } from '@/types/user/2fa.type';
import type {
    ChangePasswordRequest,
    UpdateUserRequest,
    User,
    UserData,
} from '@/types/user/user.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class UserService {
    async getUser(accessToken: string, refreshToken: string): Promise<UserData> {
        const response = await fetch(`${API}/account/profile`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
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

    async updateUser(token: string, data: UpdateUserRequest) {
        const response = await fetch(`${API}/account/profile`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật thông tin người dùng');
        }

        return response.json();
    }

    async searchUsers(token: string, search: string): Promise<User[]> {
        const query = new URLSearchParams();
        if (search) query.append('search', search);

        const response = await fetch(`${API}/admin/users?${query.toString()}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tìm kiếm người dùng');
        }

        const res = await response.json();
        return res.data.items;
    }

    async change_password(token: string, data: ChangePasswordRequest) {
        const response = await fetch(`${API}/account/change-password`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể đổi mật khẩu');
        }

        return response.json();
    }

    async enableTwoFactor(token: string, accessVerificationToken: string): Promise<Enable2FAResponse> {
        const response = await fetch(`${API}/2fa/setup`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-access-verification-token': accessVerificationToken,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể bật 2FA');
        }

        return response.json();
    }

    async verifySetUp(token: string, accessVerificationToken: string, twoFactorCode: string) {
        const response = await fetch(`${API}/2fa/verify-setup`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-access-verification-token': accessVerificationToken,
            },
            body: JSON.stringify({ two_factor_code: twoFactorCode }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xác minh thiết lập 2FA');
        }

        return response.json();
    }

    async disableTwoFactor(token: string, accessVerificationToken: string) {
        const response = await fetch(`${API}/2fa/disable`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-access-verification-token': accessVerificationToken,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tắt 2FA');
        }

        return response.json();
    }
}

export const userService = new UserService();
