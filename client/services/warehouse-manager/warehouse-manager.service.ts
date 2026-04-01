import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type { 
    WarehouseManager, 
    WarehouseManagerRole, 
    WarehouseManagerPermission,
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
    async assignManager(token: string, data: AssignWarehouseManagerPayload): Promise<WarehouseManager> {
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

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách quản lý kho của tổ chức
     */
    async listManagers(token: string, params: { warehouse_id?: string; limit?: number; offset?: number } = {}) {
        const query = new URLSearchParams();
        if (params.warehouse_id) query.append('warehouse_id', params.warehouse_id);
        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset) query.append('offset', String(params.offset));

        const response = await fetch(`${API}/warehouse-managers?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể lấy danh sách người quản lý kho');
        const res = await response.json();
        return res.data;
    }

    // ==================== PHÊ DUYỆT KHO (DÀNH CHO MANAGER) ====================

    /**
     * Danh sách yêu cầu nhập kho chờ phê duyệt
     */
    async getPendingInbounds(token: string) {
        const response = await fetch(`${API}/warehouse-manager/inventory/inbound`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách phiếu PO chờ duyệt');
        const res = await response.json();
        return res.data;
    }

    /**
     * Phê duyệt phiếu PO
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
        if (!response.ok) throw new Error('Không thể phê duyệt phiếu PO');
        const res = await response.json();
        return res.data;
    }

    // ==================== QUẢN LÝ VAI TRÒ (ROLES) ====================

    async listRoles(token: string) {
        const response = await fetch(`${API}/warehouse-manager-roles`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách vai trò');
        const res = await response.json();
        return res.data; // Trả về { items, total, limit, offset, hasMore }
    }

    async createRole(token: string, data: CreateWarehouseManagerRolePayload): Promise<WarehouseManagerRole> {
        const response = await fetch(`${API}/warehouse-manager-roles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo vai trò mới');
        }
        const res = await response.json();
        return res.data;
    }

    async updateRole(token: string, id: string, data: Partial<CreateWarehouseManagerRolePayload>): Promise<WarehouseManagerRole> {
        const response = await fetch(`${API}/warehouse-manager-roles/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật vai trò');
        }
        const res = await response.json();
        return res.data;
    }

    async deleteRole(token: string, id: string): Promise<void> {
        const response = await fetch(`${API}/warehouse-manager-roles/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa vai trò');
        }
        return;
    }

    async listPermissions(token: string) {
        const response = await fetch(`${API}/warehouse-manager-roles/permissions`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Không thể lấy danh sách quyền');
        const res = await response.json();
        return res.data; // Trả về WarehouseManagerPermission[]
    }
}

export const warehouseManagerService = new WarehouseManagerService();

