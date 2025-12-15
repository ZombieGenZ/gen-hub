export interface Warehouse {
    id: string;
    name: string;
    description: string;
    unit: string;
    length: number;
    width: number;
    is_shared_warehouse: boolean;
    is_rented: boolean;
    price_per_month: string;
    discount_1_month: string;
    discount_3_months: string;
    discount_6_months: string;
    discount_1_year: string;
    discount_2_years: string;
    discount_3_years_plus: string;
    whole_warehouse_discount: string;
    address_detail: string;
    ward_id: string;
    latitude: string;
    longitude: string;
    block_unit: string;
    block_length: string;
    block_width: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    created_by: string;
    updated_by: string;
    deleted_by: string | null;
    ward: {
        id: string;
        name: string;
        code: string;
        type: string;
        province: {
            id: string;
            name: string;
            code: string;
            type: string;
        };
    };
    images: string[];
    _count: {
        rows: number;
        images: number;
    };
}