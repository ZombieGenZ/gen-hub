// ────────────────────────────────────────────────
// Types cho warehouse instance API (khác warehouse_template)
// ────────────────────────────────────────────────

/**
 * Layout block trong 1 shelf
 */
export interface LayoutBlock {
    id: string;
    name: string;
    code: string;
    position_x: number | null;
    position_y: number | null;
    dimensions_width: number | null;
    dimensions_height: number | null;
}

/**
 * Layout shelf trong 1 rack
 */
export interface LayoutShelf {
    id: string;
    name: string;
    code: string;
    blocks: LayoutBlock[];
}

/**
 * Layout rack trong 1 row
 */
export interface LayoutRack {
    id: string;
    name: string;
    code: string;
    position_x: number | null;
    position_y: number | null;
    position_rotation: number | null;
    dimensions_width: number | null;
    dimensions_depth: number | null;
    dimensions_height: number | null;
    shelves: LayoutShelf[];
}

/**
 * Layout row trong warehouse
 */
export interface LayoutRow {
    id: string;
    name: string;
    code: string;
    position_x: number | null;
    position_y: number | null;
    position_rotation: number | null;
    is_rented: boolean;
    racks: LayoutRack[];
}

/**
 * Response từ GET /warehouses/:id/layout
 */
export interface WarehouseLayout {
    id: string;
    name: string;
    description: string | null;
    length: number;
    width: number;
    rows: LayoutRow[];
}

/**
 * Item tồn kho từ GET /inventory/stock
 */
export interface InventoryStockItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url: string | null;
    batch_code: string | null;
    expiry_date: string | null;
    quantity: number;
    quantity_on_hand: number;
    quantity_allocated: number;
    quantity_available: number;
    warehouse_id: string;
    warehouse_name: string;
    block_id: string;
    location: string;
    row_code: string;
    rack_code: string;
    days_in_storage: number;
    created_at: string;
}
