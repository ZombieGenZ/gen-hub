export interface RackWarehouseTemplate {
    id: string,
    row_template_id: string,
    name: string,
    code: string,
    description: string,
    position_x: number | null,
    position_y: number | null,
    position_rotation: number | null,
    dimensions_width: number | null,
    dimensions_depth: number | null,
    dimensions_height: number | null,
    default_block_max_weight_capacity: number | null,
    total_weight_capacity: number | null,
    total_height: number | null,
    overload_threshold_percent: string,
    is_active: boolean,
    created_at: string,
    updated_at: string,
    is_deleted: boolean,
    deleted_at: string | null,
    created_by: string,
    updated_by: string | null,
    deleted_by: string | null,
    count: {
        shelves: number
    }
}