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

// Create block template
export interface CreateBlockTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    shelf_template_id: string;
    name: string;
    code: string;
}

// Update block template
export interface UpdateBlockTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    shelf_template_id: string;
    block_template_id: string;
    name: string;
}

// Delete block template
export interface DeleteBlockTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    shelf_template_id: string;
    block_template_id: string;
}

// Delete many block template
export interface DeleteManyBlockTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    shelf_template_id: string;
    ids: string[];
}