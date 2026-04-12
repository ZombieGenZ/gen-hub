export interface IBatch {
  id: string;
  product_id: string;
  code: string;
  manufacturing_date: Date | null;
  expiry_date: Date | null;
  import_price: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean | null;
  created_by: string;
  updated_by: string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    organization_id: string;
  };
}

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
