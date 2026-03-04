import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type { 
    WarehouseManager, 
    WarehouseManagerRole, 
    AssignWarehouseManagerPayload, 
    CreateWarehouseManagerRolePayload,
    WarehouseManagerInventoryRequest
} from '../../types/warehouse-manager/warehouse-manager.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class WarehouseManagerService {
    
    // ==================== QUẢN LÝ NHÂN SỰ KHO ====================
    
    /**
     * Gán người quản lý vào kho
     */
    async assignManager(token: string, data: AssignWarehouseManagerPayload): Promise<ApiResponse<WarehouseManager>> {
        const response = await fetch(`${API}/warehouse-managers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gán người quản lý kho');
        }

        return await response.json();
    }

    /**
     * Lấy danh sách quản lý kho của tổ chức
     */
    async listManagers(token: string, params: { warehouse_id?: string; limit?: number; offset?: number } = {}): Promise<PaginatedResponse<WarehouseManager>> {
        const query = new URLSearchParams();
        if (params.warehouse_id) query.append('warehouse_id', params.warehouse_id);
        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset) query.append('offset', String(params.offset));

        const response = await fetch(`${API}/warehouse-managers?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể lấy danh sách người quản lý kho');
        return await response.json();
    }

    // ==================== PHÊ DUYỆT KHO (DÀNH CHO MANAGER) ====================

    /**
     * Danh sách yêu cầu nhập kho chờ phê duyệt
     */
    async getPendingInbounds(token: string): Promise<PaginatedResponse<WarehouseManagerInventoryRequest>> {
        const response = await fetch(`${API}/warehouse-manager/inventory/inbound`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách phiếu nhập chờ duyệt');
        return await response.json();
    }

    /**
     * Phê duyệt phiếu nhập kho
     */
    async approveInbound(token: string, id: string, notes?: string) {
        const response = await fetch(`${API}/warehouse-manager/inventory/inbound/${id}/approve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ process_notes: notes }),
        });
        if (!response.ok) throw new Error('Không thể phê duyệt phiếu nhập');
        return await response.json();
    }

    // ==================== QUẢN LÝ VAI TRÒ (ROLES) ====================

    async listRoles(token: string): Promise<ApiResponse<WarehouseManagerRole[]>> {
        const response = await fetch(`${API}/warehouse-manager-roles`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách vai trò');
        return await response.json();
    }

    async createRole(token: string, data: CreateWarehouseManagerRolePayload): Promise<ApiResponse<WarehouseManagerRole>> {
        const response = await fetch(`${API}/warehouse-manager-roles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Không thể tạo vai trò mới');
        return await response.json();
    }
}

export const warehouseManagerService = new WarehouseManagerService();
