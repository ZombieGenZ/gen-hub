export interface Insurance {
  id: string;
  name: string;
  description: string;
  price: string; // hoặc number nếu bạn muốn xử lý như số
  use_management_fee: boolean;
  management_fee_type: string; // hoặc 'PERCENT' | 'FIXED' nếu có enum
  management_fee_value: string; // hoặc number
  is_active: boolean;
  created_at: string; // hoặc Date
  updated_at: string; // hoặc Date
  is_deleted: boolean;
  deleted_at: string | null; // hoặc Date | null
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
}

export interface CreateInsuranceRequest {
  name: string;
  description: string;
  price: string;
  use_management_fee: boolean;
  management_fee_type: string;
  management_fee_value: string;
  is_active: boolean;
}

export interface UpdateInsuranceRequest {
  name: string;
  description: string;
  price: string;
  use_management_fee: boolean;
  management_fee_type: string;
  management_fee_value: string;
  is_active: boolean;
}