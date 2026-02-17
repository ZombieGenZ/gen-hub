// ========== Enums ==========
export type DurationUnit = "MONTH" | "YEAR";

// ========== Gift Types ==========
export interface TierAddonGift {
    id?: string;
    addon_id: string;
    require_min_order_amount: boolean;
    min_order_amount?: number | null;
    require_min_warehouses: boolean;
    min_warehouses?: number | null;
    require_min_rows: boolean;
    min_rows?: number | null;
    is_until_service_end: boolean;
    gift_duration_value?: number | null;
    gift_duration_unit?: DurationUnit | null;
    is_active: boolean;
    // Populated relation (from API response)
    addon?: {
        id: string;
        name: string;
        description?: string | null;
        price: number;
        is_monthly_payment: boolean;
        unit?: string | null;
    };
}

export interface TierInsuranceGift {
    id?: string;
    insurance_id: string;
    require_min_order_amount: boolean;
    min_order_amount?: number | null;
    require_min_warehouses: boolean;
    min_warehouses?: number | null;
    require_min_rows: boolean;
    min_rows?: number | null;
    is_until_service_end: boolean;
    gift_duration_value?: number | null;
    gift_duration_unit?: DurationUnit | null;
    is_active: boolean;
    // Populated relation (from API response)
    insurance?: {
        id: string;
        name: string;
        description?: string | null;
        price: string;
    };
}

// ========== Tier Response ==========
export interface RentalDurationTier {
    id: string;
    name: string;
    duration_value: number;
    duration_unit: DurationUnit;
    description?: string | null;
    order: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string | null;
    is_deleted: boolean;
    deleted_at?: string | null;
    created_by?: string | null;
    updated_by?: string | null;
    deleted_by?: string | null;
    tier_addon_gifts?: TierAddonGift[];
    tier_insurance_gifts?: TierInsuranceGift[];
}

// ========== Tier Request ==========
export interface RentalDurationTierRequest {
    name: string;
    duration_value: number;
    duration_unit: DurationUnit;
    description?: string;
    order?: number;
    is_active?: boolean;
    addon_gifts?: Omit<TierAddonGift, 'addon'>[];
    insurance_gifts?: Omit<TierInsuranceGift, 'insurance'>[];
}