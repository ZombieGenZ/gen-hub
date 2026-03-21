import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    CreatePartnerPayload,
    Partner,
    QueryPartnerParams,
    UpdatePartnerPayload,
} from './partner.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class PartnerService {
    async create(token: string, data: CreatePartnerPayload): Promise<ApiResponse<Partner>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/partners`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo đối tác');
        }

        return response.json();
    }

    async list(token: string, query: QueryPartnerParams = {}): Promise<PaginatedResponse<Partner>> {
        const orgId = await orgHelper.getOrgId(token);
        const params = new URLSearchParams();

        if (query.limit != null) params.append('limit', String(query.limit));
        if (query.offset != null) params.append('offset', String(query.offset));
        if (query.keywords) params.append('keywords', query.keywords);
        if (query.type) params.append('type', query.type);
        if (query.is_active != null) params.append('is_active', String(query.is_active));

        const qs = params.toString();
        const url = `${API}/organizations/${orgId}/partners${qs ? `?${qs}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách đối tác');
        }

        return response.json();
    }

    async listPartners(token: string, query: QueryPartnerParams = {}): Promise<PaginatedResponse<Partner>> {
        return this.list(token, query);
    }

    async getById(token: string, id: string): Promise<ApiResponse<Partner>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/partners/${id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin đối tác');
        }

        return response.json();
    }

    async getPartnerById(token: string, id: string): Promise<ApiResponse<Partner>> {
        return this.getById(token, id);
    }

    async update(token: string, id: string, data: UpdatePartnerPayload): Promise<ApiResponse<Partner>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/partners/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật đối tác');
        }

        return response.json();
    }

    async updatePartner(token: string, id: string, data: UpdatePartnerPayload): Promise<ApiResponse<Partner>> {
        return this.update(token, id, data);
    }

    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/partners/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa đối tác');
        }

        return response.json();
    }

    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/partners/delete/many`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa đối tác');
        }

        return response.json();
    }
}

export const partnerService = new PartnerService();
