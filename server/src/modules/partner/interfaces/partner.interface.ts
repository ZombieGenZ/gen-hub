export interface IPartner {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  type: 'CUSTOMER' | 'SUPPLIER';
  phone: string | null;
  email: string | null;
  tax_code: string | null;
  is_active: boolean;
  address_detail: string | null;
  ward_id: string | null;
  ward?: {
    id: string;
    name: string;
    province: {
      id: string;
      name: string;
    };
  };
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
