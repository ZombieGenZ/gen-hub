/**
 * Interfaces cho Coze Plugin Module
 * Định nghĩa cấu trúc response cho các API public phục vụ Coze AI
 */

// Pricing tier cho warehouse hoặc row
export interface IPricingTier {
    tier_id: string;
    tier_name: string;
    duration_months: number;
    discount_percent: number;
    price_per_month: number;
    total_price: number;
}

// Cấu trúc kho (rows/racks/shelves/blocks)
export interface IWarehouseStructure {
    total_rows: number;
    total_racks: number;
    total_shelves: number;
    total_blocks: number;
}

// Cấu trúc row
export interface IRowStructure {
    total_racks: number;
    total_shelves: number;
    total_blocks: number;
}

// Addon/Insurance gift
export interface IGiftInfo {
    id: string;
    name: string;
    description: string | null;
    original_price: number;
    gift_duration: string;
}

// Amenity
export interface IAmenityInfo {
    name: string;
    description: string | null;
}

// Thông tin row (cho kho chung)
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

// Response cho warehouse pricing
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
    // Chỉ có khi is_shared_warehouse = true
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

// Response cho check availability
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

// Response cho contract terms
export interface ITermsSection {
    title: string;
    content: string;
}

export interface IRentalContractTermsResponse {
    content: string;
    sections: ITermsSection[];
    last_updated: string;
}

// Response cho FAQ
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
