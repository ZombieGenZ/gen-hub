import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    InboundRequest,
    OutboundRequest,
    CreateInboundPayload,
    CreateOutboundPayload,
    QueryInboundParams,
    QueryOutboundParams,
    InventorySummary,
    InventoryTransaction,
    QueryTransactionParams,
} from './inventory.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class InventoryService {
    private readonly orgIdCache = new Map<string, string>();

    private async getOrgId(token: string): Promise<string> {
        const cachedOrgId = this.orgIdCache.get(token);
        if (cachedOrgId) {
            return cachedOrgId;
        }

        const orgId = await orgHelper.getOrgId(token);
        this.orgIdCache.set(token, orgId);
        return orgId;
    }

    // ==================== INBOUND (PHIẾU PO) ====================

    /**
     * Tạo yêu cầu nhập kho
     * @param token Access token
     * @param data Dữ liệu phiếu PO (kho, đối tác, danh sách sản phẩm)
     * @returns Response chứa phiếu PO vừa tạo
     */
    async createInbound(token: string, data: CreateInboundPayload): Promise<ApiResponse<InboundRequest>> {
        try {
            const orgId = await this.getOrgId(token);
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
            const orgId = await this.getOrgId(token);
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
     * Lấy danh sách phiếu PO (có phân trang)
     * @param token Access token
     * @param query Tham số lọc & phân trang
     * @returns Response phân trang chứa danh sách phiếu PO
     */
    async listInbound(token: string, query?: QueryInboundParams): Promise<PaginatedResponse<InboundRequest>> {
        try {
            const orgId = await this.getOrgId(token);

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
                throw new Error(errorData.message || 'Không thể lấy danh sách phiếu PO');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách phiếu PO:', error);
            throw error;
        }
    }

    /**
     * Xuất Excel danh sách phiếu PO
     * @param token Access token
     * @param query Tham số lọc
     * @returns Blob dữ liệu Excel
     */
    async exportInbound(token: string, query?: QueryInboundParams): Promise<Blob> {
        const orgId = await this.getOrgId(token);
        const params = new URLSearchParams();
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.status) params.append('status', query.status);
        if (query?.warehouse_id) params.append('warehouse_id', query.warehouse_id);

        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/export?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể xuất Excel phiếu PO');
        return response.blob();
    }

    /**
     * Tải file mẫu nhập kho
     * @param token Access token
     * @returns Blob chứa dữ liệu file Excel mẫu
     */
    async getInboundTemplate(token: string): Promise<Blob> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/template`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể tải file mẫu nhập kho');
        return response.blob();
    }

    /**
     * Nhập dữ liệu nhập kho từ file Excel
     * @param token Access token
     * @param file File Excel cần nhập
     * @returns Kết quả nhập (số lượng thành công, danh sách lỗi)
     */
    async importInbound(token: string, file: File): Promise<ApiResponse<{ successCount: number; errors: string[] }>> {
        const orgId = await this.getOrgId(token);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể nhập dữ liệu nhập kho');
        }
        return response.json();
    }

    /**
     * Lấy chi tiết phiếu PO theo ID
     * @param token Access token
     * @param id ID phiếu PO
     * @returns Response chứa thông tin phiếu PO
     */
    async getInboundById(token: string, id: string): Promise<ApiResponse<InboundRequest>> {
        try {
            const orgId = await this.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin phiếu PO');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin phiếu PO:', error);
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
            const orgId = await this.getOrgId(token);
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
            const orgId = await this.getOrgId(token);

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
     * Xuất Excel danh sách phiếu xuất kho
     * @param token Access token
     * @param query Tham số lọc
     * @returns Blob dữ liệu Excel
     */
    async exportOutbound(token: string, query?: QueryOutboundParams): Promise<Blob> {
        const orgId = await this.getOrgId(token);
        const params = new URLSearchParams();
        if (query?.keywords) params.append('keywords', query.keywords);
        if (query?.status) params.append('status', query.status);
        if (query?.warehouse_id) params.append('warehouse_id', query.warehouse_id);

        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/export?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể xuất Excel phiếu xuất');
        return response.blob();
    }

    /**
     * Tải file mẫu xuất kho
     * @param token Access token
     * @returns Blob chứa dữ liệu file Excel mẫu
     */
    async getOutboundTemplate(token: string): Promise<Blob> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/template`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể tải file mẫu xuất kho');
        return response.blob();
    }

    /**
     * Nhập dữ liệu xuất kho từ file Excel
     * @param token Access token
     * @param file File Excel cần nhập
     * @returns Kết quả nhập (số lượng thành công, danh sách lỗi)
     */
    async importOutbound(token: string, file: File): Promise<ApiResponse<{ successCount: number; errors: string[] }>> {
        const orgId = await this.getOrgId(token);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/import`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể nhập dữ liệu xuất kho');
        }
        return response.json();
    }

    /**
     * Lấy chi tiết phiếu xuất kho theo ID
     * @param token Access token
     * @param id ID phiếu xuất
     * @returns Response chứa thông tin phiếu xuất
     */
    async getOutboundById(token: string, id: string): Promise<ApiResponse<OutboundRequest>> {
        try {
            const orgId = await this.getOrgId(token);
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

    // ==================== APPROVE / REJECT ====================

    /**
     * Duyệt phiếu PO
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param notes Ghi chú duyệt
     * @returns Kết quả phản hồi từ API
     */
    async approveInbound(token: string, id: string, notes?: string): Promise<ApiResponse<InboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể duyệt phiếu PO');
        }
        return response.json();
    }

    /**
     * Từ chối phiếu PO
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param reason Lý do từ chối
     * @returns Kết quả phản hồi từ API
     */
    async rejectInbound(token: string, id: string, reason?: string): Promise<ApiResponse<InboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}/reject`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể từ chối phiếu PO');
        }
        return response.json();
    }

    /**
     * Hủy phiếu PO từ phía tổ chức tạo phiếu.
     * Hiện tại backend dùng cùng endpoint reject để chuyển trạng thái về CANCELLED.
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param reason Lý do hủy
     * @returns Kết quả phản hồi từ API
     */
    async cancelInbound(token: string, id: string, reason?: string): Promise<ApiResponse<InboundRequest>> {
        const cancelReason = reason?.trim() || 'Người tạo phiếu tự hủy';
        return this.rejectInbound(token, id, cancelReason);
    }

    // ==================== STOCK (TỒN KHO) ====================

    /**
     * Lấy danh sách tồn kho
     * @param token Token xác thực
     * @param warehouseId ID của kho (tùy chọn)
     * @param keywords Từ khóa tìm kiếm (tùy chọn)
     * @returns Danh sách tồn kho
     */
    async listStock(token: string, warehouseId?: string, keywords?: string): Promise<ApiResponse<Record<string, unknown>[]>> {
        const orgId = await this.getOrgId(token);
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouse_id', warehouseId);
        if (keywords) params.append('keywords', keywords);
        const qs = params.toString();
        const response = await fetch(`${API}/organizations/${orgId}/inventory/stock${qs ? `?${qs}` : ''}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách tồn kho');
        }
        return response.json();
    }

    /**
     * Xuất Excel báo cáo tồn kho
     * @param token Access token
     * @param warehouseId ID của kho (tùy chọn)
     * @param keywords Từ khóa tìm kiếm (tùy chọn)
     * @returns Blob dữ liệu Excel
     */
    async exportStock(token: string, warehouseId?: string, keywords?: string): Promise<Blob> {
        const orgId = await this.getOrgId(token);
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouse_id', warehouseId);
        if (keywords) params.append('keywords', keywords);

        const response = await fetch(`${API}/organizations/${orgId}/inventory/stock/export?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể xuất Excel báo cáo tồn kho');
        return response.blob();
    }

    /**
     * Bổ sung tồn kho sau khi nhập
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @returns Kết quả phản hồi từ API
     */
    async refillInventory(token: string, id: string): Promise<ApiResponse<InboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}/refill-inventory`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const err: any = new Error(errorData.message || 'Không thể bổ sung tồn kho');
            err.status = response.status;
            err.code = errorData.code;
            throw err;
        }
        return response.json();
    }

    // ==================== APPROVE/REJECT ====================

    /**
     * Duyệt phiếu xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param notes Ghi chú duyệt
     * @param picking_strategy Chiến lược lấy hàng
     * @returns Kết quả phản hồi từ API
     */
    async approveOutbound(token: string, id: string, notes?: string, picking_strategy?: string): Promise<ApiResponse<OutboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/${id}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes, picking_strategy }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể duyệt phiếu xuất');
        }
        return response.json();
    }

    /**
     * Từ chối phiếu xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param reason Lý do từ chối
     * @returns Kết quả phản hồi từ API
     */
    async rejectOutbound(token: string, id: string, reason?: string): Promise<ApiResponse<OutboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/${id}/reject`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể từ chối phiếu xuất');
        }
        return response.json();
    }

    /**
     * Hủy phiếu xuất từ phía tổ chức tạo phiếu.
     * Hiện tại backend dùng cùng endpoint reject để chuyển trạng thái về CANCELLED.
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param reason Lý do hủy
     * @returns Kết quả phản hồi từ API
     */
    async cancelOutbound(token: string, id: string, reason?: string): Promise<ApiResponse<OutboundRequest>> {
        const cancelReason = reason?.trim() || 'Người tạo phiếu tự hủy';
        return this.rejectOutbound(token, id, cancelReason);
    }

    // ==================== INBOUND WORKFLOW STEPS ====================

    /**
     * Bắt đầu quá trình kiểm đếm hàng nhập
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu bắt đầu (ID người kiểm đếm)
     * @returns Kết quả phản hồi từ API
     */
    async startReceiving(token: string, id: string, data?: { checker_id?: string }): Promise<ApiResponse<InboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}/start-receiving`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data || {}),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể bắt đầu kiểm đếm');
        }
        return response.json();
    }

    /**
     * Xác nhận kết quả kiểm đếm hàng nhập
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu xác nhận (chi tiết số lượng thực tế, ghi chú)
     * @returns Kết quả phản hồi từ API
     */
    async confirmReceiving(token: string, id: string, data: {
        details: { detail_id: string; actual_qty: number }[];
        notes?: string;
        is_customer_agreed?: boolean;
    }): Promise<ApiResponse<InboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}/confirm-receiving`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const err: any = new Error(errorData.message || 'Không thể xác nhận kiểm đếm');
            err.status = response.status;
            err.code = errorData.code;
            err.mismatches = errorData.mismatches;
            err.require_customer_agreement = errorData.require_customer_agreement;
            throw err;
        }
        return response.json();
    }

    /**
     * Xác nhận đã cất hàng vào kho
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu cất hàng (ghi chú)
     * @returns Kết quả phản hồi từ API
     */
    async confirmPutaway(token: string, id: string, data?: { notes?: string }): Promise<ApiResponse<InboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/inbound/${id}/confirm-putaway`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data || {}),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xác nhận cất hàng');
        }
        return response.json();
    }

    // ==================== OUTBOUND WORKFLOW STEPS ====================

    /**
     * Xác nhận đã nhặt hàng từ vị trí lưu trữ
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu xác nhận (chi tiết số lượng đã nhặt)
     * @returns Kết quả phản hồi từ API
     */
    async confirmPicking(token: string, id: string, data: { details: { pick_list_detail_id: string; picked_qty: number }[] }): Promise<ApiResponse<OutboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/${id}/confirm-picking`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xác nhận nhặt hàng');
        }
        return response.json();
    }

    /**
     * Xác nhận kiểm tra hàng trước khi xuất
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu xác nhận (chi tiết số lượng đã kiểm tra, kết quả đạt/không đạt)
     * @returns Kết quả phản hồi từ API
     */
    async confirmChecking(token: string, id: string, data: { details: { export_detail_id: string; checked_qty: number; passed?: boolean }[] }): Promise<ApiResponse<OutboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/${id}/confirm-checking`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xác nhận kiểm tra');
        }
        return response.json();
    }

    /**
     * Hoàn tất quá trình vận chuyển và xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu hoàn tất (ghi chú, mã vận đơn)
     * @returns Kết quả phản hồi từ API
     */
    async completeShipment(token: string, id: string, data?: { notes?: string; tracking_number?: string }): Promise<ApiResponse<OutboundRequest>> {
        const orgId = await this.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/inventory/outbound/${id}/complete-shipment`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data || {}),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể hoàn tất xuất kho');
        }
        return response.json();
    }

    // ==================== DASHBOARD & REPORTING ====================

    /**
     * Lấy tổng hợp tồn kho của kho (cho dashboard)
     */
    async getInventoryTotal(token: string, warehouseId: string): Promise<InventorySummary> {
        try {
            const orgId = await this.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/inventory/inventory-total/${warehouseId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Không thể lấy tổng hợp tồn kho');
            const result = await response.json();
            return result?.data || { total_on_hand: 0, total_available: 0, total_allocated: 0 };
        } catch (error) {
            console.error('getInventoryTotal error:', error);
            return { total_on_hand: 0, total_available: 0, total_allocated: 0 };
        }
    }

    /**
     * Lấy lịch sử biến động kho (Giao dịch)
     */
    async listTransactions(token: string, query?: QueryTransactionParams): Promise<PaginatedResponse<InventoryTransaction>> {
        try {
            const orgId = await this.getOrgId(token);
            const params = new URLSearchParams();
            if (query?.limit) params.append('limit', String(query.limit));
            if (query?.offset) params.append('offset', String(query.offset));
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.type) params.append('type', query.type);
            if (query?.warehouse_id) params.append('warehouse_id', query.warehouse_id);

            const response = await fetch(`${API}/organizations/${orgId}/inventory/transactions?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Không thể lấy lịch sử giao dịch');
            return response.json();
        } catch (error) {
            console.error('listTransactions error:', error);
            return {
                code: 'inventory-request.list_transactions_failed',
                message: 'Error',
                success: false,
                data: { items: [], total: 0, limit: 10, offset: 0, hasMore: false },
            };
        }
    }

}

