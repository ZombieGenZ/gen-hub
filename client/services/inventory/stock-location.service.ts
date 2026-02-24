import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type { StockLocation } from '@/types/product-inventory';

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Service quản lý vị trí tồn kho (Stock Locations)
 * Truy vấn thông tin tồn kho theo sản phẩm / batch / block
 */
export class StockLocationService {
    /**
     * Lấy danh sách vị trí tồn kho theo sản phẩm
     */
    async listByProduct(
        token: string,
        productId: string,
        query?: { limit?: number; offset?: number }
    ): Promise<PaginatedResponse<StockLocation>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const params = new URLSearchParams();
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));

            const qs = params.toString();
            const url = `${API}/organizations/${orgId}/products/${productId}/stock-locations${qs ? `?${qs}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy vị trí tồn kho');
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy vị trí tồn kho:', error);
            throw error;
        }
    }

    /**
     * Lấy tổng tồn kho của sản phẩm (aggregate)
     */
    async getProductStockSummary(
        token: string,
        productId: string
    ): Promise<ApiResponse<{ total_quantity: number; total_available: number; total_allocated: number }>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const url = `${API}/organizations/${orgId}/products/${productId}/stock-summary`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy tổng tồn kho');
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi lấy tổng tồn kho:', error);
            throw error;
        }
    }
}
