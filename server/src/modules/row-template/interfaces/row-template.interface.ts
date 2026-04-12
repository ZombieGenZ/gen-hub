/**
 * Interface cho RowTemplate
 */
export interface IRowTemplate {
  id: string;
  warehouse_template_id: string;
  name: string;
  code: string;
  description?: string | null;
  is_rented: boolean;
  price_per_month: number;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  position_rotation?: number | null;
  total_weight_capacity?: number | null;
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
