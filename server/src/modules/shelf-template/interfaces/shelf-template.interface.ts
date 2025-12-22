/**
 * Interface cho ShelfTemplate
 */
export interface IShelfTemplate {
    id: string;
    rack_template_id: string;
    name: string;
    code: string;
    description?: string | null;
    height?: number | null;
    total_weight_capacity?: number | null;
    position_x?: number | null;
    position_y?: number | null;
    position_rotation?: number | null;
    is_active: boolean;
    created_at: Date;
    updated_at?: Date | null;
    is_deleted?: boolean | null;
    deleted_at?: Date | null;
    created_by: string;
    updated_by?: string | null;
    deleted_by?: string | null;
}

/**
 * Interface cho response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore?: boolean;
}
