import type { ApiResponse, PaginatedResponse } from '../common.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface UserImage {
    id: string;
    user_id: string;
    type: 'AVATAR' | 'COVER';
    url: string;
    thumbnail_url?: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    is_current: boolean;
    created_at: string;
    updated_at?: string;
}

export interface QueryUserImageParams {
    limit?: number;
    offset?: number;
    type?: 'AVATAR' | 'COVER';
    is_current?: boolean;
}

export interface UploadImageResponse {
    id: string;
    url: string;
    thumbnail_url?: string;
}

/**
 * Service quản lý ảnh đại diện và ảnh bìa người dùng
 */
export class UserImageService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
        };
    }

    /** Upload ảnh đại diện mới */
    async uploadAvatar(token: string, file: File): Promise<ApiResponse<UploadImageResponse>> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API}/user-images/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể upload ảnh đại diện');
        }

        return response.json();
    }

    /** Upload ảnh bìa mới */
    async uploadCover(token: string, file: File): Promise<ApiResponse<UploadImageResponse>> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API}/user-images/cover`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể upload ảnh bìa');
        }

        return response.json();
    }

    /** Lấy danh sách ảnh của người dùng */
    async findMany(token: string, userId: string, query?: QueryUserImageParams): Promise<PaginatedResponse<UserImage>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.type) params.append('type', query.type);
        if (query?.is_current != null) params.append('is_current', String(query.is_current));

        const response = await fetch(`${API}/user-images/user/${userId}?${params.toString()}`, {
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách ảnh');
        }

        return response.json();
    }

    /** Lấy ảnh đại diện hiện tại của người dùng (public) */
    async getCurrentAvatar(userId: string): Promise<ApiResponse<UserImage>> {
        const response = await fetch(`${API}/user-images/user/${userId}/avatar/current`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy ảnh đại diện');
        }

        return response.json();
    }

    /** Lấy ảnh bìa hiện tại của người dùng (public) */
    async getCurrentCover(userId: string): Promise<ApiResponse<UserImage>> {
        const response = await fetch(`${API}/user-images/user/${userId}/cover/current`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy ảnh bìa');
        }

        return response.json();
    }

    /** Đặt ảnh làm ảnh đại diện/bìa hiện tại */
    async setAsCurrent(token: string, imageId: string): Promise<ApiResponse<UserImage>> {
        const response = await fetch(`${API}/user-images/${imageId}/set-current`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể đặt ảnh hiện tại');
        }

        return response.json();
    }

    /** Xóa ảnh */
    async delete(token: string, imageId: string): Promise<ApiResponse<null>> {
        const response = await fetch(`${API}/user-images/${imageId}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa ảnh');
        }

        return response.json();
    }
}

export const userImageService = new UserImageService();
