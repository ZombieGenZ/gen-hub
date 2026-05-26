import type { TrustBadgeLevel } from "@/services/warehouse-trust/warehouse-trust.types";

export type ContractStatus =
  | "PENDING"
  | "ACTIVE"
  | "OVERDUE_LEVEL_1"
  | "OVERDUE_LEVEL_2"
  | "OVERDUE_LEVEL_3"
  | "SEALED"
  | "COMPLETED"
  | "CANCELLED"
  | "LIQUIDATED";

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING: "Chờ xử lý",
  ACTIVE: "Đang hiệu lực",
  OVERDUE_LEVEL_1: "Quá hạn cấp 1",
  OVERDUE_LEVEL_2: "Quá hạn cấp 2",
  OVERDUE_LEVEL_3: "Quá hạn cấp 3",
  SEALED: "Đã phong tỏa",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
  LIQUIDATED: "Thanh lý",
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  OVERDUE_LEVEL_1: "bg-orange-100 text-orange-700",
  OVERDUE_LEVEL_2: "bg-red-100 text-red-700",
  OVERDUE_LEVEL_3: "bg-red-200 text-red-800",
  SEALED: "bg-purple-100 text-purple-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  LIQUIDATED: "bg-gray-200 text-gray-600",
};

export interface TrustProfileSummary {
  trust_score: number;
  badge_level: TrustBadgeLevel;
}

export interface WarehouseOwnerSummary {
  id: string;
  name: string;
  price_per_month: string;
  rental_status: string;
  is_active: boolean;
  address_detail: string | null;
  length: number;
  width: number;
  is_cold_storage: boolean;
  images: { url: string; thumbnail_url: string | null }[];
  trust_profile: TrustProfileSummary | null;
  ward: { name: string; province: { name: string } } | null;
  active_tenant_count: number;
  total_paid: number;
  total_pending: number;
}

export interface TenantOrganization {
  id: string;
  name: string;
  international_name: string | null;
  tax_code: string | null;
  headquarters_address: string | null;
  representative_name: string | null;
  representative_title: string | null;
  representative_phone: string | null;
  representative_email: string | null;
}

export interface WarehouseDetail {
  id: string;
  warehouse_name: string;
  price_per_month: string;
  discount_rate: string;
  rental_days: number;
  subtotal: string;
  is_whole_warehouse: boolean;
}

export interface TenantLease {
  contract_id: string;
  contract_code: string;
  contract_name: string | null;
  status: ContractStatus;
  started_at: string;
  expired_at: string | null;
  final_price: string;
  payment_method: string;
  auto_renew: boolean;
  tenant: TenantOrganization;
  warehouse_detail: WarehouseDetail | null;
  last_payment: { amount: number; paid_at: string } | null;
}

export interface PaymentEntry {
  amount: number;
  status: string;
  paid_at: string | null;
  type: string;
}

export interface ContractHistoryItem {
  id: string;
  code: string;
  name: string | null;
  status: ContractStatus;
  started_at: string;
  expired_at: string | null;
  final_price: string;
  organization: {
    id: string;
    name: string;
    tax_code: string | null;
    representative_name: string | null;
    representative_phone: string | null;
    representative_email: string | null;
  };
  details: { price_per_month: string; rental_days: number; subtotal: string; is_whole_warehouse: boolean }[];
  payments: PaymentEntry[];
}

export interface ContractHistoryResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  items: ContractHistoryItem[];
}

export interface RevenueMonth {
  month: string;
  contracted: number;
  paid: number;
}

export interface RevenueSummary {
  total_contracted: number;
  total_paid: number;
  total_pending: number;
  total_overdue: number;
  collection_rate: number;
}

export interface RevenueData {
  summary: RevenueSummary;
  monthly: RevenueMonth[];
}

export interface WarehouseOverviewData {
  template: {
    id: string;
    name: string;
    price_per_month: string;
    rental_status: string;
    is_active: boolean;
    address_detail: string | null;
    length: number;
    width: number;
    is_cold_storage: boolean;
    ceiling_height: string | null;
    images: { url: string; order: number }[];
    trust_profile: { trust_score: number; badge_level: TrustBadgeLevel; last_computed_at: string } | null;
    ward: { name: string; province: { name: string } } | null;
    amenities: { amenity: { name: string; icon: string | null } }[];
  };
  stats: {
    active_tenant_count: number;
    total_contract_count: number;
    expiring_soon_count: number;
    overdue_contract_count: number;
    paid_this_month: number;
    pending_amount: number;
  };
}
