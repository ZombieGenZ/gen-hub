// ────────────────────────────────────────────────
// Partner Types
// ────────────────────────────────────────────────

/**
 * Loại đối tác
 */
export type PartnerType = 'CUSTOMER' | 'SUPPLIER';

/**
 * Thông tin phường/xã kèm tỉnh/thành
 */
export interface PartnerWard {
    id: string;
    name: string;
    province: {
        id: string;
        name: string;
    };
}

/**
 * Đối tác (khách hàng / nhà cung cấp)
 */
export interface Partner {
    id: string;
    organization_id: string;
    name: string;
    code: string;
    type: PartnerType;
    phone: string | null;
    email: string | null;
    tax_code: string | null;
    address_detail: string | null;
    ward_id: string | null;
    ward?: PartnerWard | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
}

// ── Payloads ──

/**
 * Dữ liệu tạo đối tác mới
 */
export interface CreatePartnerPayload {
    name: string;
    code: string;
    type: PartnerType;
    phone?: string;
    email?: string;
    tax_code?: string;
    address_detail?: string;
    ward_id?: string;
    is_active?: boolean;
}

/**
 * Dữ liệu cập nhật đối tác (tất cả trường đều optional)
 */
export type UpdatePartnerPayload = Partial<CreatePartnerPayload>;

/**
 * Tham số query danh sách đối tác
 */
export interface QueryPartnerParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    type?: PartnerType;
    is_active?: boolean;
}
