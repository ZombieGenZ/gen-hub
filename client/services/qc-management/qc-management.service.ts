import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    QCWarehouse,
    QCWarehouseDetail,
    QCRow,
    WarehouseInstance,
    RowInstance,
    RackInstance,
    ShelfInstance,
    BlockInstance,
    QCPermission,
    AssignUserPayload,
    QueryQCParams,
} from './qc-management.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class QCManagementService {
    // ─── QC Warehouses ───

    async listQCWarehouses(
        token: string,
        params?: QueryQCParams,
    ): Promise<PaginatedResponse<QCWarehouse>> {
        const query = new URLSearchParams();
        if (params?.limit) query.set('limit', String(params.limit));
        if (params?.offset) query.set('offset', String(params.offset));
        if (params?.keywords) query.set('keywords', params.keywords);

        const response = await fetch(
            `${API}/qc-management/warehouses?${query}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách QC Warehouse');
        }
        return response.json();
    }

    async getQCWarehouse(
        token: string,
        id: string,
    ): Promise<ApiResponse<QCWarehouseDetail>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${id}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải chi tiết QC Warehouse');
        }
        return response.json();
    }

    async getWarehouseInstances(
        token: string,
        qcWarehouseId: string,
    ): Promise<ApiResponse<WarehouseInstance[]>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách kho');
        }
        return response.json();
    }

    async getWarehouseDetail(
        token: string,
        qcWarehouseId: string,
        warehouseId: string,
    ): Promise<ApiResponse<WarehouseInstance>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses/${warehouseId}`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải chi tiết kho');
        }
        return response.json();
    }

    // ─── QC Rows ───

    async getQCRows(
        token: string,
        qcWarehouseId: string,
        warehouseId: string,
    ): Promise<ApiResponse<QCRow[]>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses/${warehouseId}/rows`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách QC Row');
        }
        return response.json();
    }

    async getRowInstances(
        token: string,
        qcWarehouseId: string,
        warehouseId: string,
        qcRowId: string,
    ): Promise<ApiResponse<RowInstance[]>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses/${warehouseId}/rows/${qcRowId}/rows`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách dãy kệ');
        }
        return response.json();
    }

    // ─── Drill-down: Racks → Shelves → Blocks ───

    async getRacks(
        token: string,
        qcWarehouseId: string,
        warehouseId: string,
        rowId: string,
    ): Promise<ApiResponse<RackInstance[]>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses/${warehouseId}/rows/${rowId}/racks`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách kệ');
        }
        return response.json();
    }

    async getShelves(
        token: string,
        qcWarehouseId: string,
        warehouseId: string,
        rackId: string,
    ): Promise<ApiResponse<ShelfInstance[]>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses/${warehouseId}/racks/${rackId}/shelves`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách tầng kệ');
        }
        return response.json();
    }

    async getBlocks(
        token: string,
        qcWarehouseId: string,
        warehouseId: string,
        shelfId: string,
    ): Promise<ApiResponse<BlockInstance[]>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/warehouses/${warehouseId}/shelves/${shelfId}/blocks`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách ô kệ');
        }
        return response.json();
    }

    // ─── Permissions ───

    async listPermissions(
        token: string,
    ): Promise<ApiResponse<QCPermission[]>> {
        const response = await fetch(
            `${API}/qc-management/permissions`,
            { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể tải danh sách quyền QC');
        }
        return response.json();
    }

    // ─── Assignments ───

    async assignUserToWarehouse(
        token: string,
        qcWarehouseId: string,
        data: AssignUserPayload,
    ): Promise<ApiResponse<unknown>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/${qcWarehouseId}/assignments`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể gán nhân viên vào QC Warehouse');
        }
        return response.json();
    }

    async removeWarehouseAssignment(
        token: string,
        assignmentId: string,
    ): Promise<ApiResponse<unknown>> {
        const response = await fetch(
            `${API}/qc-management/warehouses/assignments/${assignmentId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể xoá phân công QC Warehouse');
        }
        return response.json();
    }

    async assignUserToRow(
        token: string,
        qcRowId: string,
        data: AssignUserPayload,
    ): Promise<ApiResponse<unknown>> {
        const response = await fetch(
            `${API}/qc-management/rows/${qcRowId}/assignments`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể gán nhân viên vào QC Row');
        }
        return response.json();
    }

    async removeRowAssignment(
        token: string,
        assignmentId: string,
    ): Promise<ApiResponse<unknown>> {
        const response = await fetch(
            `${API}/qc-management/rows/assignments/${assignmentId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Không thể xoá phân công QC Row');
        }
        return response.json();
    }
}
