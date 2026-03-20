const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────

export interface ShareInvite {
    id: string;
    email: string;
    sent_at: string;
}

export interface AppDownloadShare {
    id: string;
    token: string;
    max_download: number;
    current_download: number;
    is_permanent: boolean;
    expires_at?: string | null;
    is_active: boolean;
    created_at: string;
    invites: ShareInvite[];
}

export interface CreateShareInviteData {
    email: string;
    max_download?: number;
    expires_in_days?: number;
    expires_at?: string;
    is_permanent?: boolean;
}

// ─── Service ─────────────────────────────────────────────

export class AppDownloadService {
    /**
     * Lấy danh sách tất cả shares
     */
    async getAllShares(token: string): Promise<AppDownloadShare[]> {
        const response = await fetch(`${API}/app-download/shares`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch shares');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy chi tiết share theo ID
     */
    async getShareById(token: string, id: string): Promise<AppDownloadShare> {
        const response = await fetch(`${API}/app-download/shares/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch share');
        }
        return (await response.json()).data;
    }

    /**
     * Tạo lời mời và gửi email tải ứng dụng
     */
    async createInvite(token: string, data: CreateShareInviteData): Promise<AppDownloadShare> {
        const response = await fetch(`${API}/app-download/shares/invite`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create invite');
        }
        return (await response.json()).data;
    }

    /**
     * Gửi lại email lời mời
     */
    async resendInvite(token: string, id: string): Promise<void> {
        const response = await fetch(`${API}/app-download/invites/${id}/resend`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to resend invite');
        }
    }

    /**
     * Xóa lời mời (soft delete)
     */
    async deleteInvite(token: string, id: string): Promise<void> {
        const response = await fetch(`${API}/app-download/invites/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to delete invite');
        }
    }
}

export const appDownloadService = new AppDownloadService();
