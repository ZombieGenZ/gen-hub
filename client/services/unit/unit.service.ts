import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    Unit,
    CreateUnitPayload,
    UpdateUnitPayload,
    QueryUnitParams,
} from './unit.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class UnitService {
    /**
     * Tạo đơn vị tính mới
     */
    async create(token: string, data: CreateUnitPayload): Promise<ApiResponse<Unit>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/units`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo đơn vị tính');
        }

        return response.json();
    }

    /**
     * Lấy danh sách đơn vị tính (phân trang)
     */
    async list(token: string, query?: QueryUnitParams): Promise<PaginatedResponse<Unit>> {
        const orgId = await orgHelper.getOrgId(token);

        const params = new URLSearchParams();
        if (query?.limit != null) params.append('limit', String(query.limit));
        if (query?.offset != null) params.append('offset', String(query.offset));
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.is_active != null) params.append('is_active', String(query.is_active));

        const qs = params.toString();
        const url = `${API}/organizations/${orgId}/units${qs ? `?${qs}` : ''}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách đơn vị tính');
        }

        return response.json();
    }

    /**
     * Lấy chi tiết đơn vị tính
     */
    async getById(token: string, id: string): Promise<ApiResponse<Unit>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/units/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin đơn vị tính');
        }

        return response.json();
    }

    /**
     * Cập nhật đơn vị tính
     */
    async update(token: string, id: string, data: UpdateUnitPayload): Promise<ApiResponse<Unit>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/units/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật đơn vị tính');
        }

        return response.json();
    }

    /**
     * Xóa một đơn vị tính
     */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/units/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa đơn vị tính');
        }

        return response.json();
    }

    /**
     * Xóa nhiều đơn vị tính cùng lúc
     */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/units/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa đơn vị tính');
        }

        return response.json();
    }
}
