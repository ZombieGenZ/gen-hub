import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse } from '@/services/common.types';
import type {
    WarehouseLayout,
    InventoryStockItem,
    WarehouseDetail,
    WarehousePaginatedResponse,
    RowDetail,
    RackListItem,
    UpdateWarehouseDto,
    UpdateRowDto,
    UpdateRackDto,
    UpdateShelfDto,
    UpdateBlockDto,
    QueryWarehouseParams,
} from './warehouse.types';

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

    // ==================== WAREHOUSE CRUD ====================

    /**
     * Lấy danh sách warehouse của tổ chức
     * GET /organizations/:orgId/warehouses
     */
    async findMany(token: string, params: QueryWarehouseParams = {}): Promise<WarehousePaginatedResponse> {
        const orgId = await orgHelper.getOrgId(token);
        const query = new URLSearchParams();

        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));

        const response = await fetch(`${API}/organizations/${orgId}/warehouses?${query.toString()}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách kho');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Lấy chi tiết warehouse
     * GET /organizations/:orgId/warehouses/:id
     */
    async findById(token: string, warehouseId: string): Promise<WarehouseDetail> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết kho');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Cập nhật warehouse
     * PATCH /organizations/:orgId/warehouses/:id
     */
    async update(token: string, warehouseId: string, data: UpdateWarehouseDto) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật kho');
        }

        const result = await response.json();
        return result.data;
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

    /**
     * Lấy chi tiết row
     * GET /organizations/:orgId/warehouses/:id/rows/:rowId
     */
    async getRowById(token: string, warehouseId: string, rowId: string): Promise<RowDetail> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/rows/${rowId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết dãy');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Lấy danh sách racks theo row
     * GET /organizations/:orgId/warehouses/:id/rows/:rowId/racks
     */
    async getRacksByRow(token: string, warehouseId: string, rowId: string): Promise<RackListItem[]> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/rows/${rowId}/racks`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách kệ theo dãy');
        }

        const result = await response.json();
        return result.data;
    }

    /**
     * Cập nhật row
     * PATCH /organizations/:orgId/warehouses/:id/rows/:rowId
     */
    async updateRow(token: string, warehouseId: string, rowId: string, data: UpdateRowDto) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/rows/${rowId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật dãy');
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

    /**
     * Cập nhật rack
     * PATCH /organizations/:orgId/warehouses/:id/racks/:rackId
     */
    async updateRack(token: string, warehouseId: string, rackId: string, data: UpdateRackDto) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/racks/${rackId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật kệ');
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
     * Cập nhật shelf
     * PATCH /organizations/:orgId/warehouses/:id/shelves/:shelfId
     */
    async updateShelf(token: string, warehouseId: string, shelfId: string, data: UpdateShelfDto) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/shelves/${shelfId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật tầng');
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

    /**
     * Cập nhật block
     * PATCH /organizations/:orgId/warehouses/:id/blocks/:blockId
     */
    async updateBlock(token: string, warehouseId: string, blockId: string, data: UpdateBlockDto) {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/warehouses/${warehouseId}/blocks/${blockId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật ô');
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
