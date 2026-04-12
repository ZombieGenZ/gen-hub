/**
 * Interface báo giá thuê kho
 */
export interface IQuotationResult {
  warehouse_template_id: string;
  warehouse_name: string;
  rental_type: 'whole' | 'row';
  row_details?: IRowDetail[];

  duration_tier_id: string;
  duration_tier_name: string;
  duration_months: number;

  base_price_per_month: number;
  duration_discount_percent: number;
  duration_discount_amount: number;

  addons_cost: number;
  addon_details?: IAddonDetail[];

  insurance_cost: number;
  insurance_details?: IInsuranceDetail;

  management_fee: number;
  service_fee: number;

  coupon_discount: number;
  coupon_details?: ICouponDetail;

  subtotal: number;
  grand_total: number;
  deposit_amount: number;

  is_warehouse_available: boolean;
}

/**
 * Chi tiết dãy kho được chọn
 */
export interface IRowDetail {
  id: string;
  name: string;
  price_per_month: number;
}

/**
 * Chi tiết addon được chọn
 */
export interface IAddonDetail {
  id: string;
  name: string;
  price: number;
  is_monthly: boolean;
}

/**
 * Chi tiết bảo hiểm được chọn
 */
export interface IInsuranceDetail {
  id: string;
  name: string;
  price: number;
}

/**
 * Chi tiết coupon đã áp dụng
 */
export interface ICouponDetail {
  code: string;
  discount_amount: number;
}
