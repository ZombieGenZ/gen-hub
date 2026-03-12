// ────────────────────────────────────────────────
// QC Management Types
// ────────────────────────────────────────────────

export interface QCWarehouse {
    id: string;
    name: string;
    description?: string | null;
    organization_id: string;
    created_at: string;
    updated_at: string;
}

export interface QCWarehouseDetail extends QCWarehouse {
    assignments: QCAssignment[];
}

export interface QCAssignment {
    id: string;
    user_id: string;
    user?: {
        id: string;
        full_name: string;
        email: string;
    };
    permission_ids?: string[];
    created_at: string;
}

export interface QCRow {
    id: string;
    name: string;
    qc_warehouse_id: string;
    created_at: string;
    updated_at: string;
}

export interface QCRowDetail extends QCRow {
    assignments: QCAssignment[];
}

export interface WarehouseInstance {
    id: string;
    name: string;
    address?: string | null;
}

export interface RowInstance {
    id: string;
    name: string;
    warehouse_id: string;
}

export interface RackInstance {
    id: string;
    name: string;
    row_id: string;
}

export interface ShelfInstance {
    id: string;
    name: string;
    level: number;
    rack_id: string;
}

export interface BlockInstance {
    id: string;
    code: string;
    shelf_id: string;
    barcode?: string | null;
}

export interface QCPermission {
    id: string;
    name: string;
    description?: string | null;
}

export interface AssignUserPayload {
    user_id: string;
    permission_ids?: string[];
}

export interface QueryQCParams {
    limit?: number;
    offset?: number;
    keywords?: string;
}
