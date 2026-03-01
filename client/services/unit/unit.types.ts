// ────────────────────────────────────────────────
// Unit Types
// ────────────────────────────────────────────────

/**
 * Đơn vị tính
 */
export interface Unit {
    id: string;
    organization_id: string;
    name: string | null;
    description: string | null;
    is_used_multiple_languages: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
}

/**
 * Payload tạo đơn vị tính mới
 */
export interface CreateUnitPayload {
    name: string;
    description?: string;
    is_used_multiple_languages?: boolean;
    is_active?: boolean;
}

/**
 * Payload cập nhật đơn vị tính
 */
export type UpdateUnitPayload = Partial<CreateUnitPayload>;

/**
 * Tham số query danh sách đơn vị tính
 */
export interface QueryUnitParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    is_active?: boolean;
}
