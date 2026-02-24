// ────────────────────────────────────────────────
// Product Types
// ────────────────────────────────────────────────

/**
 * Đơn vị tính quy đổi của sản phẩm
 */
export interface ProductUnit {
    id: string;
    product_id: string;
    unit_id: string;
    conversion_rate: number;
    barcode: string | null;
    is_active: boolean;
    unit?: {
        id: string;
        name: string | null;
    };
    created_at: string;
    updated_at: string | null;
}

/**
 * Sản phẩm
 */
export interface Product {
    id: string;
    organization_id: string;
    name: string;
    sku: string;
    description: string | null;
    image_url: string | null;
    barcode: string | null;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    max_weight_capacity: number | null;
    cost_price: number | null;
    base_unit_id: string;
    base_unit?: {
        id: string;
        name: string | null;
    };
    units?: ProductUnit[];
    is_active: boolean;
    created_at: string;
    updated_at: string | null;
    is_deleted: boolean | null;
}

// ── Payloads ──

/**
 * Đơn vị tính quy đổi khi tạo/cập nhật sản phẩm
 */
export interface ProductUnitPayload {
    unit_id: string;
    conversion_rate: number;
    barcode?: string;
}

/**
 * Dữ liệu tạo sản phẩm mới
 */
export interface CreateProductPayload {
    name: string;
    sku: string;
    description?: string;
    image_url?: string;
    barcode?: string;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    max_weight_capacity?: number;
    cost_price?: number;
    base_unit_id: string;
    units?: ProductUnitPayload[];
    is_active?: boolean;
}

/**
 * Dữ liệu cập nhật sản phẩm (tất cả trường đều optional)
 */
export type UpdateProductPayload = Partial<CreateProductPayload>;

/**
 * Tham số query danh sách sản phẩm
 */
export interface QueryProductParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}
