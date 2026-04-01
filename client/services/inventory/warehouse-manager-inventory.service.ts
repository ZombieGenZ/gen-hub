import type { ApiResponse, PaginatedResponse } from "@/services/common.types";
import type { ExportStatus, InboundRequest, OutboundRequest, QueryInboundParams, QueryOutboundParams, ReceiptStatus } from "./inventory.types";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Service cho Warehouse Manager thao tác quy trình nhập/xuất kho.
 * Base URL: /warehouse-manager/inventory
 */
export class WarehouseManagerInventoryService {
    // ─── INBOUND ───

    /**
     * Lấy danh sách phiếu PO
     * @param token Token xác thực
     * @param query Tham số truy vấn (limit, offset, keywords, warehouse_id, status)
     * @returns Danh sách phiếu PO phân trang
     */
    async listInbound(
        token: string,
        query?: QueryInboundParams,
    ): Promise<PaginatedResponse<InboundRequest>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append("limit", String(query.limit));
        if (query?.offset != null) params.append("offset", String(query.offset));
        if (query?.keywords) params.append("keywords", query.keywords);
        if (query?.warehouse_id) params.append("warehouse_id", query.warehouse_id);
        if (query?.status) params.append("status", query.status as ReceiptStatus);

        const qs = params.toString();
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound${qs ? `?${qs}` : ""}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể lấy danh sách phiếu PO");
        }
        return await response.json();
    }

    /**
     * Lấy chi tiết phiếu PO theo ID
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @returns Chi tiết phiếu PO
     */
    async getInboundById(
        token: string,
        id: string,
    ): Promise<ApiResponse<InboundRequest>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể lấy chi tiết phiếu PO");
        }
        return await response.json();
    }

    /**
     * Duyệt phiếu PO
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu duyệt (số lượng thực tế, ghi chú)
     * @returns Kết quả phản hồi từ API
     */
    async approveInbound(
        token: string,
        id: string,
        data?: {
            actual_quantities?: { detail_id: string; actual_qty: number }[];
            notes?: string;
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}/approve`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data || {}),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể duyệt phiếu PO");
        }
        return await response.json();
    }

    /**
     * Phân công nhân viên cho phiếu PO
     * POST /warehouse-manager/inventory/inbound/:id/assign-workers
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Thông tin phân công (checker_id, worker_id)
     * @returns Kết quả phản hồi từ API
     */
    async assignWorkers(
        token: string,
        id: string,
        data: { checker_id?: string; worker_id?: string },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}/assign-workers`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể phân công nhân viên");
        }
        return await response.json();
    }

    /**
     * Từ chối phiếu PO
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param reason Lý do từ chối
     * @returns Kết quả phản hồi từ API
     */
    async rejectInbound(
        token: string,
        id: string,
        reason: string,
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}/reject`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason }),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể từ chối phiếu PO");
        }
        return await response.json();
    }

    /**
     * Bắt đầu quá trình kiểm đếm hàng nhập
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu bắt đầu (ID người kiểm đếm)
     * @returns Kết quả phản hồi từ API
     */
    async startReceiving(
        token: string,
        id: string,
        data?: { checker_id?: string },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}/start-receiving`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data || {}),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể bắt đầu kiểm đếm");
        }
        return await response.json();
    }

    /**
     * Xác nhận kết quả kiểm đếm hàng nhập
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu xác nhận (chi tiết số lượng thực tế, ghi chú)
     * @returns Kết quả phản hồi từ API
     */
    async confirmReceiving(
        token: string,
        id: string,
        data: {
            details: { detail_id: string; actual_qty: number }[];
            notes?: string;
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}/confirm-receiving`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể xác nhận kiểm đếm");
        }
        return await response.json();
    }

    /**
     * Xác nhận đã cất hàng vào kho
     * @param token Token xác thực
     * @param id ID của phiếu PO
     * @param data Dữ liệu cất hàng (chi tiết vị trí cất hàng, số lượng thực tế, ghi chú)
     * @returns Kết quả phản hồi từ API
     */
    async confirmPutaway(
        token: string,
        id: string,
        data?: {
            details?: { putaway_detail_id: string; actual_qty: number }[];
            notes?: string;
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/inbound/${id}/confirm-putaway`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data || {}),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể xác nhận cất hàng");
        }
        return await response.json();
    }

    // ─── OUTBOUND ───

    /**
     * Lấy danh sách phiếu xuất kho
     * @param token Token xác thực
     * @param query Tham số truy vấn (limit, offset, keywords, warehouse_id, status)
     * @returns Danh sách phiếu xuất kho phân trang
     */
    async listOutbound(
        token: string,
        query?: QueryOutboundParams,
    ): Promise<PaginatedResponse<OutboundRequest>> {
        const params = new URLSearchParams();
        if (query?.limit != null) params.append("limit", String(query.limit));
        if (query?.offset != null) params.append("offset", String(query.offset));
        if (query?.keywords) params.append("keywords", query.keywords);
        if (query?.warehouse_id) params.append("warehouse_id", query.warehouse_id);
        if (query?.status) params.append("status", query.status as ExportStatus);

        const qs = params.toString();
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound${qs ? `?${qs}` : ""}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể lấy danh sách phiếu xuất");
        }
        return await response.json();
    }

    /**
     * Lấy chi tiết phiếu xuất kho theo ID
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @returns Chi tiết phiếu xuất kho
     */
    async getOutboundById(
        token: string,
        id: string,
    ): Promise<ApiResponse<OutboundRequest>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể lấy chi tiết phiếu xuất");
        }
        return await response.json();
    }

    /**
     * Duyệt phiếu xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu duyệt (chiến lược lấy hàng, ghi chú)
     * @returns Kết quả phản hồi từ API
     */
    async approveOutbound(
        token: string,
        id: string,
        data?: {
            picking_strategy?: "FEFO" | "FIFO";
            notes?: string;
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}/approve`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data || {}),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể duyệt phiếu xuất");
        }
        return await response.json();
    }

    /**
     * Tách phiếu xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @returns Kết quả phản hồi từ API
     */
    async splitOutbound(
        token: string,
        id: string,
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}/split`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể tách phiếu xuất");
        }
        return await response.json();
    }

    /**
     * Từ chối phiếu xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param reason Lý do từ chối
     * @returns Kết quả phản hồi từ API
     */
    async rejectOutbound(
        token: string,
        id: string,
        reason: string,
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}/reject`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ reason }),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể từ chối phiếu xuất");
        }
        return await response.json();
    }

    /**
     * Xác nhận đã nhặt hàng từ vị trí lưu trữ
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu xác nhận (chi tiết số lượng đã nhặt)
     * @returns Kết quả phản hồi từ API
     */
    async confirmPicking(
        token: string,
        id: string,
        data: {
            details: { pick_list_detail_id: string; picked_qty: number }[];
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}/confirm-picking`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể xác nhận nhặt hàng");
        }
        return await response.json();
    }

    /**
     * Xác nhận kiểm tra hàng trước khi xuất
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu xác nhận (chi tiết số lượng đã kiểm tra, kết quả đạt/không đạt)
     * @returns Kết quả phản hồi từ API
     */
    async confirmChecking(
        token: string,
        id: string,
        data: {
            details: {
                export_detail_id: string;
                checked_qty: number;
                passed?: boolean;
            }[];
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}/confirm-checking`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể xác nhận kiểm tra");
        }
        return await response.json();
    }

    /**
     * Hoàn tất quá trình vận chuyển và xuất kho
     * @param token Token xác thực
     * @param id ID của phiếu xuất kho
     * @param data Dữ liệu hoàn tất (ghi chú, mã vận đơn)
     * @returns Kết quả phản hồi từ API
     */
    async completeShipment(
        token: string,
        id: string,
        data?: {
            notes?: string;
            tracking_number?: string;
        },
    ): Promise<ApiResponse<any>> {
        const response = await fetch(
            `${API}/warehouse-manager/inventory/outbound/${id}/complete-shipment`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data || {}),
            },
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Không thể hoàn tất xuất kho");
        }
        return await response.json();
    }
}

