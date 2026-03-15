/**
 * Interface định nghĩa cấu trúc một lô hàng (Batch)
 */
export interface BatchItem {
    id: string;
    product_id: string;
    code: string;
    manufacturing_date: string;
    expiry_date: string;
    import_price: number;
    is_active: true;
    created_at: string;
}

export interface BatchItemDetail extends BatchItem {
    product: Product;
}

export interface Product {
    id: string;
    name: string;
    sku: string;
}

/**
 * Dữ liệu yêu cầu khi tạo mới lô hàng
 */
export interface CreateBatchDto {
    product_id: string;
    code: string;
    manufacturing_date: string;
    expiry_date: string;
    import_price: number;
    is_active: boolean;
}

/**
 * Dữ liệu yêu cầu khi cập nhật lô hàng
 */
export interface UpdateBatchDto {
    expiry_date?: string;
    import_price?: number;
}

/**
 * Tham số query khi tìm kiếm/lọc lô hàng
 */
export interface BatchQuery {
    keywords?: string;
    limit?: number;
    offset?: number;
    // status?: string;
}
