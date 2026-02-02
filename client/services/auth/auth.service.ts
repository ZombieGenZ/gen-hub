import type { RegisterInput, LoginInput, ChangePass, ForgotPasswordInput } from '@/types/auth/auth.type';
import { authStorage } from './auth-storage.service';

const API = process.env.NEXT_PUBLIC_API_URL

export class AuthService {
    /**
     * Đăng ký
     * @param input Dữ liệu đăng ký
     * @returns Dữ liệu phản hồi
     */
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

    /**
     * Đăng nhập
     * @param input Dữ liệu đăng nhập
     * @returns Dữ liệu phản hồi
     */
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
            return data;
        } else {
            authStorage.setRequies2fa(data.data.requires_2fa);
            authStorage.setTempToken(data.data.temp_token);
            return data;
        }
    }

    /**
     * Đăng nhập 2FA
     * @param temp_token Token tạm thời
     * @param auth_code Mã xác nhận 2FA
     * @param backup_code Mã резерв
     * @returns Dữ liệu phản hồi
     */
    async login2fa(temp_token: string, auth_code?: string, backup_code?: string) {
        try {
            const response = await fetch(`${API}/2fa/verify-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    temp_token: temp_token,
                    ...(auth_code && { two_factor_code: auth_code }),
                    ...(backup_code && { backup_code: backup_code })
                })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Login failed');
            }
            authStorage.clearRequies2fa();
            const data = await response.json();
            authStorage.setTokens(
                data.authorization.access_token,
                data.authorization.refresh_token
            );
            await this.verify_password(data.authorization.access_token, "", auth_code, backup_code);
            return data;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }

    /**
     * Xác minh bằng mật khẩu
     * @param token Token xác thực
     * @param password Mật khẩu (tùy chọn)
     * @param auth_code Mã xác thực 2FA (tùy chọn)
     * @param backup_code Mã dự phòng (tùy chọn)
     * @returns Kết quả xác minh
     */
    async verify_password(token: string, password?: string, auth_code?: string, backup_code?: string) {
        const response = await fetch(`${API}/auth/verify-access`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                ...(password && { password: password }),
                ...(auth_code && { two_factor_code: auth_code }),
                ...(backup_code && { backup_code: backup_code }) })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Password verification failed');
        }

        const data = await response.json();
        authStorage.setVerificationToken(data.data.access_verification_token);
        return data;
    }

    /**
     * Đăng xuất
     * @param token Token truy cập
     * @param refresh_token Token làm mới
     * @returns Kết quả đăng xuất
     */
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
        } catch (error: unknown) {
            // Clear tokens even if there's an error to ensure clean state
            authStorage.clearTokens();
            throw error;
        }
    }

    /**
     * Đăng xuất tất cả thiết bị
     * @param token Token truy cập
     * @returns Kết quả đăng xuất tất cả thiết bị
     */
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
        } catch (error: unknown) {
            // Clear tokens even if there's an error to ensure clean state
            authStorage.clearTokens();
            throw error;
        }
    }

    /**
     * Lấy token mới từ refresh token
     * @param refresh_token Token làm mới
     * @returns Cặp token mới (access và refresh)
     */
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

        // API trả về authorization ở top-level: { authorization: { access_token, refresh_token } }
        const auth = data.authorization || data;
        const accessToken = auth.access_token ?? auth.accessToken;
        const refreshToken = auth.refresh_token ?? auth.refreshToken;
        if (!accessToken || !refreshToken) {
            authStorage.clearTokens();
            throw new Error('Invalid refresh response: missing tokens');
        }

        authStorage.setTokens(accessToken, refreshToken);
        return data;
    }

    /**
     * Lấy access token còn hiệu lực: nếu hết hạn thì thử refresh bằng refresh token.
     * @returns Access token hoặc null nếu không thể có token hợp lệ
     */
    async getValidAccessToken(): Promise<string | null> {
        if (authStorage.isAuthenticated()) {
            return authStorage.getAccessToken();
        }
        const refreshToken = authStorage.getRefreshToken();
        if (!refreshToken) return null;
        try {
            await this.getNewToken(refreshToken);
            return authStorage.getAccessToken();
        } catch {
            authStorage.clearTokens();
            return null;
        }
    }

    /**
     * Xác minh email
     * @param access_token Token truy cập
     * @param token Token xác minh email
     * @returns Kết quả xác minh email
     */
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

    /**
     * Gửi lại email xác minh
     * @param token Token truy cập
     * @returns Kết quả gửi lại email xác minh
     */
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

    /**
     * Yêu cầu đặt lại mật khẩu (Quên mật khẩu)
     * @param input Thông tin yêu cầu (email)
     * @returns Kết quả yêu cầu đặt lại mật khẩu
     */
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

    /**
     * Kiểm tra token đặt lại mật khẩu
     * @param token Token đặt lại mật khẩu
     * @returns Kết quả kiểm tra token
     */
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

    /**
     * Đặt lại mật khẩu mới
     * @param req Thông tin đặt lại mật khẩu
     * @returns Kết quả đặt lại mật khẩu
     */
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

    /**
     * Gửi email quên mật khẩu (Deprecated? Use forgotpassword instead)
     * @param email Email người dùng
     * @returns Kết quả gửi email
     */
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

    /**
     * Tạo mã dự phòng mới
     * @param access_token Token truy cập
     * @param access_verification_token Token xác minh truy cập
     * @returns Danh sách mã dự phòng mới
     */
    async generateBackupcode(access_token: string, access_verification_token: string) {
        const response = await fetch(`${API}/2fa/regenerate-backup-codes`, {
            method: "POST",
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
                'x-access-verification-token': `${access_verification_token}`
            }
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to generate backup code');
        }

        const data = await response.json()
        return data
    }
}
export const authService = new AuthService();
