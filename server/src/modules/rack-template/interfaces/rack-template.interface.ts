/**
 * Interface cho RackTemplate
 */
export interface IRackTemplate {
  id: string;
  row_template_id: string;
  name: string;
  code: string;
  description?: string | null;
  default_block_max_weight_capacity?: number | null;
  total_weight_capacity?: number | null;
  total_height?: number | null;
  overload_threshold_percent?: number | null;
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
