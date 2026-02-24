import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    Batch,
    CreateBatchPayload,
    UpdateBatchPayload,
    QueryBatchParams,
} from './batch.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class BatchService {
    /**
     * Tạo lô hàng mới
     * @param token Access token
     * @param data Dữ liệu lô hàng
     * @returns Response chứa lô hàng vừa tạo
     */
    async create(token: string, data: CreateBatchPayload): Promise<ApiResponse<Batch>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/batches`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể tạo lô hàng');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi tạo lô hàng:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách lô hàng theo sản phẩm (có phân trang)
     * @param token Access token
     * @param productId ID sản phẩm
     * @param query Tham số lọc & phân trang
     * @returns Response phân trang chứa danh sách lô hàng
     */
    async listByProduct(token: string, productId: string, query?: QueryBatchParams): Promise<PaginatedResponse<Batch>> {
        try {
            const orgId = await orgHelper.getOrgId(token);

            const params = new URLSearchParams();
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.is_active != null) params.append('is_active', String(query.is_active));

            const qs = params.toString();
            const url = `${API}/organizations/${orgId}/products/${productId}/batches${qs ? `?${qs}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách lô hàng');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách lô hàng:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết lô hàng theo ID
     * @param token Access token
     * @param id ID lô hàng
     * @returns Response chứa thông tin lô hàng
     */
    async getById(token: string, id: string): Promise<ApiResponse<Batch>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/batches/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin lô hàng');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin lô hàng:', error);
            throw error;
        }
    }

    /**
     * Cập nhật lô hàng
     * @param token Access token
     * @param id ID lô hàng
     * @param data Dữ liệu cần cập nhật (không bao gồm product_id)
     * @returns Response chứa lô hàng sau khi cập nhật
     */
    async update(token: string, id: string, data: UpdateBatchPayload): Promise<ApiResponse<Batch>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/batches/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể cập nhật lô hàng');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi cập nhật lô hàng:', error);
            throw error;
        }
    }

    /**
     * Xóa một lô hàng (soft delete)
     * @param token Access token
     * @param id ID lô hàng
     * @returns Response xác nhận xóa
     */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/batches/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xóa lô hàng');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi xóa lô hàng:', error);
            throw error;
        }
    }

    /**
     * Xóa nhiều lô hàng cùng lúc (soft delete)
     * @param token Access token
     * @param ids Danh sách ID lô hàng cần xóa
     * @returns Response xác nhận xóa
     */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/batches/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xóa nhiều lô hàng');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi xóa nhiều lô hàng:', error);
            throw error;
        }
    }
}
