import type { RegisterInput, LoginInput, ChangePass, ForgotPasswordInput } from '@/types/auth/auth.type';
import { authStorage } from './auth-storage.service';

const API = process.env.NEXT_PUBLIC_API_URL

export class AuthService {

    // Đăng ký
    async register(input: RegisterInput) {
        const response = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Registration failed');
        }

        return response.json();
    }

    // Đăng nhập
    async login(input: LoginInput) {
        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(input)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Login failed');
        }

        const data = await response.json();

        // Store tokens if 2FA is not enabled
        if (data.data?.two_factor_enabled === false) {
            authStorage.setTokens(
                data.authorization.access_token,
                data.authorization.refresh_token
            );
            await this.verify_password(data.authorization.access_token, input.password);
        }

        return data;
    }

    //Xác minh bằng mật khẩu
    async verify_password(token: string, password: string) {
        const response = await fetch(`${API}/auth/verify-access`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Password verification failed');
        }

        const data = await response.json();
        authStorage.setVerificationToken(data.data.access_verification_token);
        return data;
    }

    //Đăng xuất
    async logout(token: string, refresh_token: string) {
        try {
            const response = await fetch(`${API}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Logout failed');
            }

            const data = await response.json();
            authStorage.clearTokens();
            return data;
        } catch (error: any) {
            // Clear tokens even if there's an error to ensure clean state
            authStorage.clearTokens();
            throw error;
        }
    }

    //Đăng xuất tất cả thiết bị
    async logoutAllDevices(token: string) {
        try {
            const response = await fetch(`${API}/auth/logout-all`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Logout from all devices failed');
            }

            const data = await response.json();
            authStorage.clearTokens();
            return data;
        } catch (error: any) {
            // Clear tokens even if there's an error to ensure clean state
            authStorage.clearTokens();
            throw error;
        }
    }

    // Lấy token mới
    async getNewToken(refresh_token: string) {
        const response = await fetch(`${API}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Clear tokens on error
            authStorage.clearTokens();
            throw new Error(errorData.message || 'Failed to refresh token');
        }

        const data = await response.json();

        // Update tokens in storage
        authStorage.setTokens(
            data.authorization.access_token,
            data.authorization.refresh_token
        );

        return data;
    }

    //Xác minh email
    async confirmToken(access_token: string, token: string) {
        const response = await fetch(`${API}/auth/verify-email`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Email verification failed');
        }

        return response.json();
    }

    //Xác minh token
    async confirmEmail(token: string) {
        const response = await fetch(`${API}/auth/resend-verification`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Token verification failed');
        }

        return response.json();
    }

    // Quên mật khẩu
    async forgotpassword(input: ForgotPasswordInput) {
        const response = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'vi',
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to process forgot password request');
        }

        return response.json();
    }

    // kiểm tra token sửa mật khẩu
    async checkToken(token: string) {
        const response = await fetch(`${API}/auth/verify-forgot-password-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'vi',
            },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Invalid or expired token');
        }

        return response.json();
    }

    // Thay đổi mật khẩu quên
    async changePass(req: ChangePass) {
        const response = await fetch(`${API}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'vi',
            },
            body: JSON.stringify({
                new_password: req.new_password,
                confirm_password: req.confirm_password,
                logout_all_devices: true,
                token: req.token, // gửi token cho BE
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to change password');
        }

        return response.json();
    }

    // Gửi email quên mật khẩu
    async forgotPass(email: string) {
        const response = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'vi',
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to send password reset email');
        }

        return response.json();
    }
}