export interface IPricingTier {
  tier_id: string;
  tier_name: string;
  duration_months: number;
  discount_percent: number;
  price_per_month: number;
  total_price: number;
}

export interface IWarehouseStructure {
  total_rows: number;
  total_racks: number;
  total_shelves: number;
  total_blocks: number;
}

export interface IRowStructure {
  total_racks: number;
  total_shelves: number;
  total_blocks: number;
}

export interface IGiftInfo {
  id: string;
  name: string;
  description: string | null;
  original_price: number;
  gift_duration: string;
}

export interface IAmenityInfo {
  name: string;
  description: string | null;
}

export interface IRowPricing {
  id: string;
  name: string;
  code: string;
  description: string | null;
  base_price_per_month: number;
  is_rented: boolean;
  pricing_tiers: IPricingTier[];
  structure: IRowStructure;
  addon_gifts: IGiftInfo[];
  insurance_gifts: IGiftInfo[];
}

export interface IWarehousePricingItem {
  id: string;
  name: string;
  description: string | null;
  area: number;
  address: string | null;
  province: { id: string; name: string } | null;
  base_price_per_month: number;
  pricing_tiers: IPricingTier[];
  structure: IWarehouseStructure;
  is_shared_warehouse: boolean;
  is_cold_storage: boolean;
  rows?: IRowPricing[];
  addon_gifts: IGiftInfo[];
  insurance_gifts: IGiftInfo[];
  amenities: IAmenityInfo[];
  images: string[];
}

export interface IWarehousePricingResponse {
  items: IWarehousePricingItem[];
  total: number;
  limit: number;
}

export interface IAvailableRow {
  id: string;
  name: string;
  code: string;
  price_per_month: number;
}

export interface IRowsSummary {
  total: number;
  available: number;
  rented: number;
  available_rows: IAvailableRow[];
}

export interface IAvailabilityResponse {
  warehouse_id: string;
  warehouse_name: string;
  is_available: boolean;
  rental_status: 'AVAILABLE' | 'LOCKED' | 'RENTED';
  current_contracts_count: number;
  rows_summary?: IRowsSummary;
}

export interface ITermsSection {
  title: string;
  content: string;
}

export interface IRentalContractTermsResponse {
  content: string;
  sections: ITermsSection[];
  last_updated: string;
}

export interface IFaqItem {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface IFaqForAiResponse {
  items: IFaqItem[];
  total: number;
}

export interface IWarehouseRecommendationItem {
  warehouse_id: string;
  name: string;
  address: string | null;
  area: number;
  base_price_per_month: number;
  is_cold_storage: boolean;
  is_shared_warehouse: boolean;
  images: string[];
  match_score: number;
  match_reason: string;
  highlights: string[];
  checkout_url: string;
}

export interface IWarehouseRecommendationResponse {
  extracted_filters: {
    province_name?: string | null;
    area_min?: number | null;
    area_max?: number | null;
    budget_max_monthly?: number | null;
    is_cold_storage?: boolean | null;
    is_shared?: boolean | null;
    keywords?: string | null;
    industry?: string | null;
    location_hints?: string[];
  };
  recommendations: IWarehouseRecommendationItem[];
  ai_note: string;
}
