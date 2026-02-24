// ────────────────────────────────────────────────
// Batch Types (Lô hàng)
// ────────────────────────────────────────────────

/**
 * Lô hàng
 */
export interface Batch {
    id: string;
    product_id: string;
    code: string;
    manufacturing_date: string | null;
    expiry_date: string | null;
    import_price: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean | null;
    product?: {
        id: string;
        name: string;
        sku: string;
        organization_id: string;
    };
}

// ── Payloads ──

/**
 * Dữ liệu tạo lô hàng mới
 */
export interface CreateBatchPayload {
    product_id: string;
    code: string;
    manufacturing_date?: string;
    expiry_date?: string;
    import_price?: number;
    is_active?: boolean;
}

/**
 * Dữ liệu cập nhật lô hàng (product_id không được cập nhật)
 */
export type UpdateBatchPayload = Partial<Omit<CreateBatchPayload, 'product_id'>>;

/**
 * Tham số query danh sách lô hàng
 */
export interface QueryBatchParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}
