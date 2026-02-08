import { ReceiptStatus, ExportStatus } from '@prisma/client';

/**
 * Interface cho chi tiết sản phẩm trong yêu cầu nhập kho
 */
export interface IInboundDetail {
    id: string;
    receipt_id: string;
    product_id: string;
    batch_id?: string | null;
    expected_qty: number;
    actual_qty: number;
    unit_id: string;
    conversion_rate: number;
    product?: {
        id: string;
        name: string;
        sku: string;
        image_url?: string | null;
    };
    batch?: {
        id: string;
        code: string;
        expiry_date?: Date | null;
    } | null;
    unit?: {
        id: string;
        name?: string | null;
    };
}

/**
 * Interface cho yêu cầu nhập kho (Receipt)
 */
export interface IInboundRequest {
    id: string;
    organization_id: string;
    warehouse_id: string;
    partner_id?: string | null;
    code: string;
    purchase_order_code?: string | null;
    status: ReceiptStatus;
    notes?: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    created_by?: string | null;
    updated_by?: string | null;
    warehouse?: {
        id: string;
        name: string;
    };
    partner?: {
        id: string;
        name: string;
        code: string;
    } | null;
    details?: IInboundDetail[];
    _count?: {
        details: number;
    };
}

/**
 * Interface cho chi tiết sản phẩm trong yêu cầu xuất kho
 */
export interface IOutboundDetail {
    id: string;
    export_id: string;
    product_id: string;
    required_batch_id?: string | null;
    quantity: number;
    unit_id: string;
    conversion_rate: number;
    product?: {
        id: string;
        name: string;
        sku: string;
        image_url?: string | null;
    };
    batch?: {
        id: string;
        code: string;
        expiry_date?: Date | null;
    } | null;
    unit?: {
        id: string;
        name?: string | null;
    };
}

/**
 * Interface cho yêu cầu xuất kho (Export)
 */
export interface IOutboundRequest {
    id: string;
    organization_id: string;
    warehouse_id: string;
    partner_id?: string | null;
    code: string;
    sales_order_code?: string | null;
    status: ExportStatus;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    created_by?: string | null;
    updated_by?: string | null;
    warehouse?: {
        id: string;
        name: string;
    };
    partner?: {
        id: string;
        name: string;
        code: string;
    } | null;
    details?: IOutboundDetail[];
    _count?: {
        details: number;
    };
}

/**
 * Interface cho response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Chiến lược xuất kho
 */
export enum PickingStrategy {
    FEFO = 'FEFO', // First Expired First Out - Hạn sử dụng gần hết xuất trước
    FIFO = 'FIFO', // First In First Out - Nhập trước xuất trước
}

/**
 * Interface cho kết quả thuật toán fill kho
 */
export interface IFillResult {
    success: boolean;
    filled_quantity: number;
    remaining_quantity: number;
    inventory_records: Array<{
        block_id: string;
        quantity: number;
        batch_id?: string | null;
    }>;
    error?: string;
}

/**
 * Interface cho kết quả thuật toán pick hàng
 */
export interface IPickResult {
    success: boolean;
    picked_quantity: number;
    remaining_quantity: number;
    pick_items: Array<{
        inventory_id: string;
        block_id: string;
        batch_id?: string | null;
        quantity: number;
    }>;
    error?: string;
}
