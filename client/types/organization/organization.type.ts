// Owner (lồng trong Organization)
export interface OrganizationOwner {
  id: string;
  name: string;
  email: string;
}

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
  gmail_watch_label_ids: string;
  gmail_watch_renew_interval_hours: number;
  auto_delete_api_key_logs: boolean;
  api_key_logs_retention_ms: number;
  auto_delete_org_audit_logs: boolean;
  org_audit_logs_retention_ms: number;
  min_loss_tolerance: string;
  max_loss_tolerance: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  owner: OrganizationOwner;
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
export interface OrganizationCreateRequest {
    name: string;                    // Tên công ty
    international_name?: string;     // Tên quốc tế (tuỳ chọn)
    tax_code: string;               // Mã số thuế (10 hoặc 13 số)
    headquarters_address: string;    // Địa chỉ trụ sở chính
    invoice_address?: string;        // Địa chỉ xuất hoá đơn (mặc định = headquarters_address)
    representative_name: string;     // Tên người đại diện
    representative_title: string;    // Chức danh (VD: Giám đốc, Chủ tịch HĐQT)
    representative_phone: string;    // Số điện thoại liên hệ
    representative_email: string;    // Email liên hệ
    email_primary_address?: string;
    gmail_pubsub_subscription?: string;
    gmail_pubsub_topic?: string;
    gmail_webhook_secret?: string;
    google_client_id?: string;
    google_client_secret?: string;
    google_refresh_token?: string;
    is_active?: boolean;
    is_using_google_email?: boolean;
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