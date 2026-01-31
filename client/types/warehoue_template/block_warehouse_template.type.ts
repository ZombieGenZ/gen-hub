export interface BlockWarehouseTemplate {
    id: string;
    shelf_template_id: string;
    name: string;
    code: string;
    description: string | null;
    position_x: number | null;
    position_y: number | null;
    dimensions_width: number | null;
    dimensions_height: number | null;
    max_weight_capacity: number | null;
    height: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    created_by: string;
    updated_by: string | null;
    deleted_by: string | null;
}