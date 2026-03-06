import type { ApiResponse } from "@/services/common.types";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Service cho Warehouse Manager thao tác quy trình nhập/xuất kho.
 * Base URL: /warehouse-manager/inventory
 */
export class WarehouseManagerInventoryService {
    // ─── INBOUND ───

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
            throw new Error(errorData.message || "Không thể duyệt phiếu nhập");
        }
        return await response.json();
    }

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
            throw new Error(errorData.message || "Không thể từ chối phiếu nhập");
        }
        return await response.json();
    }

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
