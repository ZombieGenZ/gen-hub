// ────────────────────────────────────────────────
// Product Inventory Types (Quản lý Hàng hóa & Tồn kho)
// ────────────────────────────────────────────────

import type { Batch } from '@/services/batch/batch.types';

/**
 * Mức độ cảnh báo hạn sử dụng (Expiry Traffic Light)
 */
export type ExpiryStatus = 'expired' | 'warning' | 'safe';

/**
 * Trạng thái lọc nhanh sản phẩm
 */
export type ProductQuickFilter = 'all' | 'low_stock' | 'expiring_soon';

/**
 * Thông tin tồn kho tổng hợp của sản phẩm
 */
export interface ProductStockSummary {
    product_id: string;
    total_quantity: number;
    total_available: number;
    total_allocated: number;
    batch_count: number;
    expiring_soon_count: number;
    expired_count: number;
}

/**
 * Vị trí tồn kho (Stock Location) — nơi sản phẩm đang được lưu trữ
 */
export interface StockLocation {
    id: string;
    product_id: string;
    batch_id: string | null;
    block_id: string;
    shelf_id: string;
    quantity_available: number;
    quantity_allocated: number;
    block?: {
        id: string;
        name: string;
        code: string;
    };
    shelf?: {
        id: string;
        name: string;
        rack?: {
            id: string;
            name: string;
        };
    };
    batch?: {
        id: string;
        code: string;
        expiry_date: string | null;
    } | null;
}

/**
 * Batch mở rộng với thông tin tồn kho hiện tại
 */
export interface BatchWithStock extends Batch {
    current_stock?: number;
    locations?: StockLocation[];
}

/**
 * Dữ liệu bán hàng (Sales Velocity) cho dự báo
 */
export interface SalesVelocity {
    product_id: string;
    batch_id?: string;
    avg_daily_sold: number;
    total_sold_30d: number;
    trend: 'increasing' | 'stable' | 'decreasing';
}

/**
 * Cảnh báo thông minh (Smart Alert)
 */
export interface SmartAlert {
    id: string;
    type: 'expiry_risk' | 'price_spike' | 'low_stock' | 'expired';
    severity: 'info' | 'warning' | 'danger';
    title: string;
    message: string;
    product_id?: string;
    batch_id?: string;
    action_label?: string;
    action_type?: 'create_coupon' | 'lock_batch' | 'reorder';
    created_at: string;
}

/**
 * Giá nhập qua các lô (cho Sparkline chart)
 */
export interface PricePoint {
    batch_code: string;
    import_price: number;
    date: string;
}

/**
 * Kết quả dự báo hạn sử dụng
 */
export interface ExpiryForecast {
    batch_id: string;
    batch_code: string;
    expiry_date: string;
    days_remaining: number;
    current_stock: number;
    avg_daily_sold: number;
    estimated_days_to_sell: number;
    will_expire_before_sold: boolean;
    risk_level: ExpiryStatus;
}

// ── Helpers ──

/**
 * Tính trạng thái hạn sử dụng dựa trên expiry_date
 * @param expiryDate Ngày hết hạn (ISO string)
 * @param warningDays Số ngày cảnh báo trước khi hết hạn (mặc định: 30)
 */
export function getExpiryStatus(expiryDate: string | null, warningDays = 30): ExpiryStatus {
    if (!expiryDate) return 'safe';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'expired';
    if (diffDays <= warningDays) return 'warning';
    return 'safe';
}

/**
 * Tính số ngày còn lại đến hạn sử dụng
 */
export function getDaysUntilExpiry(expiryDate: string | null): number | null {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Tạo mã lô gợi ý theo cấu trúc quy chuẩn: YYYYMMDD-SKU-XX
 */
export function suggestBatchCode(sku: string, existingCount: number): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(existingCount + 1).padStart(2, '0');
    return `${dateStr}-${sku}-${seq}`;
}

/**
 * Màu sắc cho trạng thái hạn sử dụng
 */
export const expiryStatusConfig: Record<ExpiryStatus, {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
}> = {
    expired: {
        label: 'Đã hết hạn',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: '🔴',
    },
    warning: {
        label: 'Sắp hết hạn',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: '🟡',
    },
    safe: {
        label: 'Còn hạn',
        color: 'text-emerald-700',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        icon: '🟢',
    },
};
