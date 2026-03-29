// ────────────────────────────────────────────────
// Organization Notification Service
// Route: /organizations/:orgId/notifications
// ────────────────────────────────────────────────

import type {
    IOrgNotification,
    CreateOrgNotificationDto,
    UpdateOrgNotificationDto,
    QueryOrgNotificationParams,
    OrgNotificationPaginatedResponse,
} from './org-notification.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class OrgNotificationService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Tạo thông báo tổ chức mới
     * POST /organizations/:orgId/notifications
     */
    async create(token: string, orgId: string, data: CreateOrgNotificationDto): Promise<IOrgNotification> {
        const response = await fetch(`${API}/organizations/${orgId}/notifications`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo thông báo');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách thông báo tổ chức
     * GET /organizations/:orgId/notifications
     */
    async findMany(token: string, orgId: string, params: QueryOrgNotificationParams = {}): Promise<OrgNotificationPaginatedResponse> {
        const query = new URLSearchParams();

        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.type) query.append('type', params.type);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.warehouse_id) query.append('warehouse_id', params.warehouse_id);

        const response = await fetch(`${API}/organizations/${orgId}/notifications?${query.toString()}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách thông báo');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết thông báo tổ chức
     * GET /organizations/:orgId/notifications/:id
     */
    async findById(token: string, orgId: string, id: string): Promise<IOrgNotification> {
        const response = await fetch(`${API}/organizations/${orgId}/notifications/${id}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết thông báo');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật thông báo tổ chức
     * PUT /organizations/:orgId/notifications/:id
     */
    async update(token: string, orgId: string, id: string, data: UpdateOrgNotificationDto): Promise<IOrgNotification> {
        const response = await fetch(`${API}/organizations/${orgId}/notifications/${id}`, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật thông báo');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa thông báo tổ chức
     * DELETE /organizations/:orgId/notifications/:id
     */
    async delete(token: string, orgId: string, id: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/notifications/${id}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa thông báo');
        }
    }

    /**
     * Xóa nhiều thông báo tổ chức
     * DELETE /organizations/:orgId/notifications/delete/many
     */
    async deleteMany(token: string, orgId: string, ids: string[]): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/notifications/delete/many`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các thông báo đã chọn');
        }
    }
}

export const orgNotificationService = new OrgNotificationService();
