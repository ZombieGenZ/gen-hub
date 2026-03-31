import type { ApiResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface TwoFactorSetupResponse {
    secret: string;
    qr_code_url: string;
}

export interface VerifyTwoFactorSetupDto {
    two_factor_code: string;
}

export interface VerifyTwoFactorSetupResponse {
    backup_codes: string[];
}

export interface VerifyTwoFactorLoginDto {
    temp_token: string;
    two_factor_code?: string;
    backup_code?: string;
}

export interface TwoFactorLoginResponse {
    id: string;
    name: string;
    email: string;
    email_confirmed: boolean;
    is_verified: boolean;
    two_factor_enabled: boolean;
    language: string;
    created_at: string;
    metadata: {
        access_token: string;
        refresh_token: string;
    };
}

export interface RegenerateBackupCodesResponse {
    backup_codes: string[];
}

/**
 * Service xác thực 2 yếu tố (2FA)
 */
export class TwoFactorService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /** Thiết lập xác thực 2 yếu tố (2FA) */
    async setup(token: string): Promise<ApiResponse<TwoFactorSetupResponse>> {
        const response = await fetch(`${API}/2fa/setup`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể thiết lập 2FA');
        }

        return response.json();
    }

    /** Xác minh và bật 2FA */
    async verifySetup(token: string, dto: VerifyTwoFactorSetupDto): Promise<ApiResponse<VerifyTwoFactorSetupResponse>> {
        const response = await fetch(`${API}/2fa/verify-setup`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Xác minh 2FA thất bại');
        }

        return response.json();
    }

    /** Tắt xác thực 2 yếu tố (2FA) */
    async disable(token: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/2fa/disable`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tắt 2FA');
        }

        return response.json();
    }

    /** Xác minh 2FA khi đăng nhập */
    async verifyLogin(dto: VerifyTwoFactorLoginDto): Promise<ApiResponse<TwoFactorLoginResponse>> {
        const response = await fetch(`${API}/2fa/verify-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dto),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Xác minh 2FA đăng nhập thất bại');
        }

        return response.json();
    }

    /** Tạo mới backup codes */
    async regenerateBackupCodes(token: string): Promise<ApiResponse<RegenerateBackupCodesResponse>> {
        const response = await fetch(`${API}/2fa/regenerate-backup-codes`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo mã backup mới');
        }

        return response.json();
    }
}

export const twoFactorService = new TwoFactorService();
