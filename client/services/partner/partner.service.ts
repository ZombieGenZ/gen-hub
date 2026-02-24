import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    Partner,
    CreatePartnerPayload,
    UpdatePartnerPayload,
    QueryPartnerParams,
} from './partner.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class PartnerService {
    /**
     * Tạo đối tác mới
     * @param token Access token
     * @param data Dữ liệu đối tác
     * @returns Response chứa đối tác vừa tạo
     */
    async create(token: string, data: CreatePartnerPayload): Promise<ApiResponse<Partner>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/partners`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể tạo đối tác');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi tạo đối tác:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách đối tác (có phân trang)
     * @param token Access token
     * @param query Tham số lọc & phân trang
     * @returns Response phân trang chứa danh sách đối tác
     */
    async list(token: string, query?: QueryPartnerParams): Promise<PaginatedResponse<Partner>> {
        try {
            const orgId = await orgHelper.getOrgId(token);

            const params = new URLSearchParams();
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.type) params.append('type', query.type);
            if (query?.is_active != null) params.append('is_active', String(query.is_active));

            const qs = params.toString();
            const url = `${API}/organizations/${orgId}/partners${qs ? `?${qs}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách đối tác');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đối tác:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết đối tác theo ID
     * @param token Access token
     * @param id ID đối tác
     * @returns Response chứa thông tin đối tác
     */
    async getById(token: string, id: string): Promise<ApiResponse<Partner>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/partners/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin đối tác');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin đối tác:', error);
            throw error;
        }
    }

    /**
     * Cập nhật đối tác
     * @param token Access token
     * @param id ID đối tác
     * @param data Dữ liệu cần cập nhật
     * @returns Response chứa đối tác sau khi cập nhật
     */
    async update(token: string, id: string, data: UpdatePartnerPayload): Promise<ApiResponse<Partner>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/partners/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể cập nhật đối tác');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi cập nhật đối tác:', error);
            throw error;
        }
    }

    /**
     * Xóa một đối tác (soft delete)
     * @param token Access token
     * @param id ID đối tác
     * @returns Response xác nhận xóa
     */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/partners/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xóa đối tác');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi xóa đối tác:', error);
            throw error;
        }
    }

    /**
     * Xóa nhiều đối tác cùng lúc (soft delete)
     * @param token Access token
     * @param ids Danh sách ID đối tác cần xóa
     * @returns Response xác nhận xóa
     */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/partners/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xóa nhiều đối tác');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi xóa nhiều đối tác:', error);
            throw error;
        }
    }
}
