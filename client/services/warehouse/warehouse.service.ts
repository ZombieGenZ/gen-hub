import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse } from '@/services/common.types';
import type { WarehouseLayout, InventoryStockItem } from './warehouse.types';

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Service gọi API warehouse instance (kho thực - khác warehouse_template).
 * Dùng cho 3D warehouse visualization.
 */
export class WarehouseService {

    // ==================== LAYOUT ====================

    /**
     * Lấy layout đầy đủ của warehouse (rows → racks → shelves → blocks)
     * GET /organizations/:orgId/warehouses/:id/layout
     */
    async getLayout(token: string, warehouseId: string): Promise<WarehouseLayout> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/layout`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy layout kho');
        }

        const result: ApiResponse<WarehouseLayout> = await response.json();
        return result.data;
    }

    /**
     * Lấy tồn kho theo warehouse (để render boxes trong 3D)
     * GET /organizations/:orgId/warehouses/:id/inventory-stock
     */
    async getInventoryStock(token: string, warehouseId: string): Promise<InventoryStockItem[]> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/inventory-stock`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy tồn kho');
        }

        const result: ApiResponse<InventoryStockItem[]> = await response.json();
        return result.data ?? [];
    }

    // ==================== ROWS ====================

    /**
     * Lấy danh sách rows trong warehouse
     * GET /organizations/:orgId/warehouses/:id/rows
     */
    async getRows(token: string, warehouseId: string) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/rows`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách dãy');
        }

        const result = await response.json();
        return result.data;
    }

    // ==================== RACKS ====================

    /**
     * Lấy danh sách racks trong warehouse
     * GET /organizations/:orgId/warehouses/:id/racks
     */
    async getRacks(token: string, warehouseId: string) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/racks`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách kệ');
        }

        const result = await response.json();
        return result.data;
    }

    // ==================== SHELVES & BLOCKS ====================

    /**
     * Lấy shelves trong rack
     * GET /organizations/:orgId/warehouses/:id/racks/:rackId/shelves
     */
    async getShelves(token: string, warehouseId: string, rackId: string) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(
            `${API}/organizations/${orgId}/warehouses/${warehouseId}/racks/${rackId}/shelves`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách tầng');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Lấy blocks trong shelf
     * GET /organizations/:orgId/warehouses/:id/racks/:rackId/shelves/:shelfId/blocks
     */
    async getBlocks(token: string, warehouseId: string, rackId: string, shelfId: string) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(
            `${API}/organizations/${orgId}/warehouses/${warehouseId}/racks/${rackId}/shelves/${shelfId}/blocks`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách ô');
        }

        const result = await response.json();
        return result.data;
    }

    // ==================== WAREHOUSES LIST ====================

    /**
     * Lấy danh sách kho của tổ chức (có hợp đồng thuê ACTIVE)
     * GET /organizations/:orgId/inventory/warehouses
     */
    async listWarehouses(token: string): Promise<{ id: string; name: string }[]> {
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
    }
}

export const warehouseService = new WarehouseService();
