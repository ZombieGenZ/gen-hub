export interface IProductUnit {
    id: string;
    product_id: string;
    unit_id: string;
    conversion_rate: number;
    barcode: string | null;
    is_active: boolean;
    unit?: {
        id: string;
        name: string | null;
    };
    created_at: Date;
    updated_at: Date | null;
}

export interface IProduct {
    id: string;
    organization_id: string;
    name: string;
    sku: string;
    description: string | null;
    image_url: string | null;
    barcode: string | null;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    max_weight_capacity: number | null;
    cost_price: number | null;
    base_unit_id: string;
    base_unit?: {
        id: string;
        name: string | null;
    };
    units?: IProductUnit[];
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    is_deleted: boolean | null;
    created_by: string;
    updated_by: string | null;
    /** Chỉ có khi query kèm warehouse_id */
    quantity_available?: number;
}

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
