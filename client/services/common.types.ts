// ────────────────────────────────────────────────
// Shared types dùng chung cho tất cả services
// ────────────────────────────────────────────────

/**
 * Response envelope chuẩn từ backend
 */
export interface ApiResponse<T = unknown> {
    code: string;
    message: string;
    success: boolean;
    data: T;
}

/**
 * Cấu trúc dữ liệu phân trang
 */
export interface PaginatedData<T = unknown> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
}

/**
 * Response phân trang đầy đủ (envelope + data)
 */
export type PaginatedResponse<T = unknown> = ApiResponse<PaginatedData<T>>;
