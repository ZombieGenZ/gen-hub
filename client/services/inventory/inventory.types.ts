// ────────────────────────────────────────────────
// Inventory Types (Yêu cầu nhập/xuất kho)
// ────────────────────────────────────────────────

/**
 * Trạng thái phiếu nhập kho
 */
export type ReceiptStatus = 'PENDING' | 'APPROVED' | 'RECEIVING' | 'PROCESSING' | 'PUTAWAY' | 'COMPLETED' | 'CANCELLED';

/**
 * Trạng thái phiếu xuất kho
 */
export type ExportStatus = 'PENDING' | 'PICKING' | 'CHECKING' | 'PACKED' | 'SHIPPED' | 'CANCELLED';

/**
 * Chiến lược xuất kho
 */
export type PickingStrategy = 'FEFO' | 'FIFO';

// ── Inbound (Nhập kho) ──

/**
 * Chi tiết sản phẩm trong phiếu nhập kho (response)
 */
export interface InboundDetail {
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
        expiry_date?: string | null;
    } | null;
    unit?: {
        id: string;
        name?: string | null;
    };
}

/**
 * Yêu cầu nhập kho (response)
 */
export interface InboundRequest {
    id: string;
    organization_id: string;
    warehouse_id: string;
    partner_id?: string | null;
    code: string;
    purchase_order_code?: string | null;
    status: ReceiptStatus;
    notes?: string | null;
    expected_arrival?: string | null;
    vehicle_info?: string | null;
    approved_by?: string | null;
    approved_at?: string | null;
    checker_id?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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
    details?: InboundDetail[];
    _count?: {
        details: number;
    };
}

/**
 * Chi tiết sản phẩm khi tạo phiếu nhập kho
 */
export interface InboundDetailPayload {
    product_id: string;
    batch_id?: string;
    expected_qty: number;
    unit_id: string;
    /** Mã lô hàng mới (bắt buộc nếu không có batch_id) */
    batch_code?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    import_price?: number;
}

/**
 * Dữ liệu tạo yêu cầu nhập kho
 */
export interface CreateInboundPayload {
    warehouse_id: string;
    partner_id?: string;
    purchase_order_code?: string;
    notes?: string;
    details: InboundDetailPayload[];
}

/**
 * Tham số query danh sách phiếu nhập kho
 */
export interface QueryInboundParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: ReceiptStatus;
    warehouse_id?: string;
}

// ── Outbound (Xuất kho) ──

/**
 * Chi tiết sản phẩm trong phiếu xuất kho (response)
 */
export interface OutboundDetail {
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
        expiry_date?: string | null;
    } | null;
    unit?: {
        id: string;
        name?: string | null;
    };
}

/**
 * Yêu cầu xuất kho (response)
 */
export interface OutboundRequest {
    id: string;
    organization_id: string;
    warehouse_id: string;
    partner_id?: string | null;
    code: string;
    sales_order_code?: string | null;
    status: ExportStatus;
    approved_by?: string | null;
    approved_at?: string | null;
    picker_id?: string | null;
    checker_id?: string | null;
    tracking_number?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
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
    details?: OutboundDetail[];
    _count?: {
        details: number;
    };
}

/**
 * Chi tiết sản phẩm khi tạo phiếu xuất kho
 */
export interface OutboundDetailPayload {
    product_id: string;
    quantity: number;
    unit_id: string;
    /** ID lô hàng cụ thể muốn xuất (optional) */
    required_batch_id?: string;
}

/**
 * Dữ liệu tạo yêu cầu xuất kho
 */
export interface CreateOutboundPayload {
    warehouse_id: string;
    partner_id?: string;
    sales_order_code?: string;
    notes?: string;
    picking_strategy?: PickingStrategy;
    details: OutboundDetailPayload[];
}

/**
 * Tham số query danh sách phiếu xuất kho
 */
export interface QueryOutboundParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: ExportStatus;
    warehouse_id?: string;
}

// ── Warehouse Manager Inventory Payload Types ──

export interface ApproveInboundPayload {
    actual_quantities?: { detail_id: string; actual_qty: number }[];
    notes?: string;
}

export interface StartReceivingPayload {
    checker_id?: string;
}

export interface ConfirmReceivingPayload {
    details: { detail_id: string; actual_qty: number }[];
    notes?: string;
}

export interface ConfirmPutawayPayload {
    details?: { putaway_detail_id: string; actual_qty: number }[];
    notes?: string;
}

export interface ApproveOutboundPayload {
    picking_strategy?: PickingStrategy;
    notes?: string;
}

export interface ConfirmPickingPayload {
    details: { pick_list_detail_id: string; picked_qty: number }[];
}

export interface ConfirmCheckingPayload {
    details: {
        export_detail_id: string;
        checked_qty: number;
        passed?: boolean;
    }[];
}

export interface CompleteShipmentPayload {
    notes?: string;
    tracking_number?: string;
}
