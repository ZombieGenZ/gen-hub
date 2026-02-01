import type { AddonResponse } from "../addon/addon.type";
import type { Insurance } from "../insurance/Insurance.types";

// Nested duration tier (trong discount_configs)
export interface DurationTierRow {
  id: string;
  name: string;
  duration_value: number;
  duration_unit: string;
  description: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
}

// Discount config (có duration_tier lồng)
export interface DiscountConfigRow {
  id: string;
  row_template_id: string;
  duration_tier_id: string;
  discount_percent: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  duration_tier: DurationTierRow;
}

export interface Row_template {
  id: string;
  warehouse_template_id: string;
  name: string;
  code: string;
  description: string;
  is_rented: boolean;
  price_per_month: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  position_x: number | null;
  position_y: number | null;
  position_rotation: number | null;
  total_weight_capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  discount_configs: DiscountConfigRow[];
  _count: {
    racks: number;
  };
}

// Addon gift (có addon lồng)
export interface AddonGiftRow {
  id: string;
  row_template_id: string;
  addon_id: string;
  is_until_service_end: boolean;
  gift_duration_value: number;
  gift_duration_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  addon: AddonResponse;
}

// Row detail = Row_template + addon_gifts, insurance_gifts, racks
export interface Row_Detail_template extends Row_template {
  addon_gifts: AddonGiftRow[];
  insurance_gifts: Insurance[];
  racks: unknown[];
}

// create row template
export interface CreateRowTemplateRequest {
  warehouse_template_id: string;
  name: string;
  code: string;
  price_per_month: number;
  is_active: boolean;
}

// update row template
export interface UpdateRowTemplateRequest {
  warehouse_template_id: string;
  row_template_id: string;
  name: string;
  description: string;
  price_per_month: number;
}

// Delete row template
export interface DeleteRowTemplateRequest {
  warehouse_template_id: string;
  row_template_id: string;
}

// Delete many row template
export interface DeleteManyRowTemplateRequest {
  warehouse_template_id: string;
  ids: string[];
}
