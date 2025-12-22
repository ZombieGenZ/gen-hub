/**
 * Interface cho BlockTemplate
 */
export interface IBlockTemplate {
    id: string;
    shelf_template_id: string;
    name: string;
    code: string;
    description?: string | null;
    max_weight_capacity?: number | null;
    height?: number | null;
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

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
