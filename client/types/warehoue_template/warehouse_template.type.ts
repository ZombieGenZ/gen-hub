import type { Row_template } from './row_warehouse_template.type';

// Base entity fields that are common across many types
interface BaseEntity {
    id: string;
    created_at: string;
    created_by: string;
    updated_at: string | null;
    updated_by: string | null;
    deleted_at: string | null;
    deleted_by: string | null;
    is_active: boolean;
    is_deleted: boolean;
}

// Location related interfaces
interface Province {
    id: string;
    code: string;
    name: string;
    type: string;
}

interface Ward extends BaseEntity {
    code: string;
    name: string;
    type: string;
    province: Province;
}

// Addon related interfaces
interface Addon extends BaseEntity {
    name: string;
    description: string;
    price: string;
    is_monthly_payment: boolean;
}

interface AddonGift extends BaseEntity {
    addon: Addon;
    addon_id: string;
    gift_duration_unit: string;
    gift_duration_value: number;
    is_until_service_end: boolean;
    warehouse_template_id: string;
}

// Duration and discount related
interface DurationTier extends BaseEntity {
    name: string;
    duration_value: number;
    duration_unit: string;
    description: string;
    order: number;
}

interface DiscountConfig extends BaseEntity {
    discount_percent: string;
    duration_tier: DurationTier;
    duration_tier_id: string;
    warehouse_template_id?: string;
    row_template_id?: string;
}

// Image interface
interface WarehouseImage {
    id: string;
    file_id: string;
    order: number;
    original_name: string;
    size: number;
    thumbnail_url: string;
    url: string;
    created_at: string;
}

// Main Warehouse interface
export interface Warehouse extends BaseEntity {
  // Basic info
    name: string;
    description: string;
    type?: string;
  
  // Dimensions
    length: number;
    width: number;
    ceiling_height: string;
    block_length: string;
    block_width: string;
  
  // Location
    address_detail: string;
    latitude: string;
    longitude: string;
    ward: Ward;
    ward_id: string;
  
  // Status and type flags
    is_cold_storage: boolean;
    is_rented: boolean;
    is_shared_warehouse: boolean;
    rental_status: string;
  
  // Environmental controls
    max_humidity: string;
    min_humidity: string;
    max_temperature: string;
    min_temperature: string;
    max_load_capacity: number | null;
    total_weight_capacity: number | null;
  
  // Pricing
    price_per_month: string;
  
  // Manager info
    manager_name: string;
    manager_email: string;
    manager_phone: string;
  
  // Relations
    addon_gifts: AddonGift[];
    discount_configs: DiscountConfig[];
    images: WarehouseImage[];
    rows: Row_template[];
    amenities: {
        id: string;
        amenity_id: string;
        amenity: {
            id: string;
            name: string;
            icon: string;
        };
    }[];
}

// Create warehouse template interface
export interface WarehouseRequest {
  name: string;
  description: string;
  length: number;
  width: number;
  price_per_month: number;
  discount_configs: {
    duration_tier_id: string;
    discount_percent: number;
  }[];
  is_shared_warehouse: boolean;
  address_detail: string;
  ward_id: string;
  latitude: number;
  longitude: number;
  block_length: number;
  block_width: number;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  ceiling_height: number;
  amenity_ids: string[];
  is_cold_storage: boolean;
  min_temperature: number;
  max_temperature: number;
  min_humidity: number;
  max_humidity: number;
  is_active: boolean;
  addon_gifts: {
    addon_id: string;
    is_until_service_end: boolean;
    gift_duration_value: number;
    gift_duration_unit: string;
    is_active: boolean;
  }[];
}