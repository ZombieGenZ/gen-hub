export interface Organization {
    id: string;
    name: string;
    international_name: string | null;
    is_active: boolean;
    is_deleted: boolean;
    owner_id: string;
    tax_code: string;
    headquarters_address: string;
    representative_name: string;
    representative_title: string;
    representative_phone: string;
    representative_email: string;
    is_using_google_email: boolean;
    _count: {
        members: number;
        roles: number;
        api_keys: number;
    };
}

export interface OrganizationResponse {
    items: Organization[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Request payload cho tạo/cập nhật tổ chức
 */
export interface OrganizationRequest {
    name: string;                    // Tên công ty
    international_name?: string;     // Tên quốc tế (tuỳ chọn)
    tax_code: string;               // Mã số thuế (10 hoặc 13 số)
    headquarters_address: string;    // Địa chỉ trụ sở chính
    invoice_address?: string;        // Địa chỉ xuất hoá đơn (mặc định = headquarters_address)
    representative_name: string;     // Tên người đại diện
    representative_title?: string;   // Chức danh (VD: Giám đốc, Chủ tịch HĐQT)
    representative_phone: string;    // Số điện thoại liên hệ
    representative_email: string;    // Email liên hệ
}

/**
 * Kết quả kiểm tra mã số thuế
 */
export interface TaxCodeValidationResult {
    is_valid: boolean;
    exists?: boolean;              // Đã tồn tại trong hệ thống chưa
    company_name?: string;         // Tên công ty (nếu tìm thấy)
    message?: string;
}