export interface RentalDurationTier {
    id: string,
    name: string,
    duration_value: number,
    duration_unit: string,
    description: string,
    order: number,
    is_active: boolean,
    created_at: string,
    updated_at: string,
    is_deleted: boolean,
    deleted_at: string,
    created_by: string,
    updated_by: string,
    deleted_by: string
}

export interface RentalDurationTierRequest {
    name: string,
    duration_value: number,
    duration_unit: string,
    description: string,
    order: number,
    is_active: boolean,
    addon_gifts: [
        {
            id: string,
            addon_id: string,
            require_min_order_amount: boolean,
            min_order_amount: number,
            require_min_warehouses: boolean,
            min_warehouses: number,
            require_min_rows: boolean,
            min_rows: number,
            is_until_service_end: boolean,
            gift_duration_value: number,
            gift_duration_unit: string,
            is_active: boolean
        }
    ] 
}