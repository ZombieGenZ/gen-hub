import { RentalDurationTier } from "../rental-duration-tier/rental-duration-tier.type";

export interface RowTemplate {
    id: string;
    warehouse_template_id: string;
    name: string;
    code: string;
    description?: string | null;
    is_rented: boolean;
    price_per_month: number;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    position_x?: number | null;
    position_y?: number | null;
    position_rotation?: number | null;
    total_weight_capacity?: number | null;
    is_active: boolean;
    created_at: Date;
    updated_at?: Date | null;
    is_deleted?: boolean | null;
    deleted_at?: Date | null;
    created_by: string;
    updated_by?: string | null;
    deleted_by?: string | null;
    discount_configs: [
        {
            id: string,
            row_template_id: string,
            duration_tier_id: string,
            discount_percent: string,
            is_active: true,
            created_at: string,
            updated_at: string,
            is_deleted: false,
            deleted_at: string,
            created_by: string,
            updated_by: string,
            deleted_by: string,
            duration_tier: RentalDurationTier
        }
    ],
    _count: {
        racks: 0
    }
}