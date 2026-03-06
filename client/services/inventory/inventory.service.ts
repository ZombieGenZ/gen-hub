import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    InboundRequest,
    OutboundRequest,
    CreateInboundPayload,
    CreateOutboundPayload,
    QueryInboundParams,
    QueryOutboundParams,
} from './inventory.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class InventoryService {
    // ==================== INBOUND (PHIẾU NHẬP) ====================

    /**
     * Tạo yêu cầu nhập kho
     * @param token Access token
     * @param data Dữ liệu phiếu nhập (kho, đối tác, danh sách sản phẩm)
     * @returns Response chứa phiếu nhập vừa tạo
     */
    async createInbound(token: string, data: CreateInboundPayload): Promise<ApiResponse<InboundRequest>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể tạo yêu cầu nhập kho');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi tạo yêu cầu nhập kho:', error);
            throw error;    
        }
    }

    /**
     * Lấy danh sách kho mà tổ chức đang có hợp đồng thuê
     * @param token Access token
     * @returns Danh sách kho { id, name }[]
     */
    async listWarehouses(token: string): Promise<{ id: string; name: string }[]> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/warehouses`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách kho');
            }
            const result = await response.json();
            return result?.data ?? result ?? [];
        } catch (error) {
            console.error('Lỗi khi lấy danh sách kho:', error);
            return [];
        }
    }

    /**
     * Lấy danh sách phiếu nhập kho (có phân trang)
     * @param token Access token
     * @param query Tham số lọc & phân trang
     * @returns Response phân trang chứa danh sách phiếu nhập
     */
    async listInbound(token: string, query?: QueryInboundParams): Promise<PaginatedResponse<InboundRequest>> {
        try {
            const orgId = await orgHelper.getOrgId(token);

            const params = new URLSearchParams();
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.status) params.append('status', query.status);
            if (query?.warehouse_id) params.append('warehouse_id', query.warehouse_id);

            const qs = params.toString();
            const url = `${API}/organizations/${orgId}/inventory/inbound${qs ? `?${qs}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách phiếu nhập kho');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách phiếu nhập kho:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết phiếu nhập kho theo ID
     * @param token Access token
     * @param id ID phiếu nhập
     * @returns Response chứa thông tin phiếu nhập
     */
    async getInboundById(token: string, id: string): Promise<ApiResponse<InboundRequest>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin phiếu nhập kho');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin phiếu nhập kho:', error);
            throw error;
        }
    }

    // ==================== OUTBOUND (PHIẾU XUẤT) ====================

    /**
     * Tạo yêu cầu xuất kho
     * @param token Access token
     * @param data Dữ liệu phiếu xuất (kho, đối tác, chiến lược, danh sách sản phẩm)
     * @returns Response chứa phiếu xuất vừa tạo
     */
    async createOutbound(token: string, data: CreateOutboundPayload): Promise<ApiResponse<OutboundRequest>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể tạo yêu cầu xuất kho');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi tạo yêu cầu xuất kho:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách phiếu xuất kho (có phân trang)
     * @param token Access token
     * @param query Tham số lọc & phân trang
     * @returns Response phân trang chứa danh sách phiếu xuất
     */
    async listOutbound(token: string, query?: QueryOutboundParams): Promise<PaginatedResponse<OutboundRequest>> {
        try {
            const orgId = await orgHelper.getOrgId(token);

            const params = new URLSearchParams();
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.status) params.append('status', query.status);
            if (query?.warehouse_id) params.append('warehouse_id', query.warehouse_id);

            const qs = params.toString();
            const url = `${API}/organizations/${orgId}/inventory/outbound${qs ? `?${qs}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách phiếu xuất kho');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách phiếu xuất kho:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết phiếu xuất kho theo ID
     * @param token Access token
     * @param id ID phiếu xuất
     * @returns Response chứa thông tin phiếu xuất
     */
    async getOutboundById(token: string, id: string): Promise<ApiResponse<OutboundRequest>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin phiếu xuất kho');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin phiếu xuất kho:', error);
            throw error;
        }
    }
}
