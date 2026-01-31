export interface ShelfWarehouseTemplate {
    id: string;
    rack_template_id: string;
    name: string;
    code: string;
    description: string | null;
    height: number | null;
    total_weight_capacity: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    created_by: string;
    updated_by: string | null;
    deleted_by: string | null;
    _count: {
        blocks: number;
    };
}