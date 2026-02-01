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

// Create shelf template
export interface CreateShelfTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    name: string;
    code: string;
}

// Update shelf template
export interface UpdateShelfTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    shelf_template_id: string;
    name: string;
}

// Delete shelf template
export interface DeleteShelfTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    shelf_template_id: string;
}

// Delete many shelf template
export interface DeleteManyShelfTemplateRequest {
    warehouse_template_id: string;
    row_template_id: string;
    rack_template_id: string;
    ids: string[];
}
