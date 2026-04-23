import { Coupon } from "@/types/coupons/coupon.type";
import { DurationUnit } from "@/types/rental-duration-tier/rental-duration-tier.type";

export interface QuotationBreakdown {
  basePrice: number; // Tương ứng base_price_per_month từ API
  durationMonths: number;
  durationDiscountPercent: number;
  durationDiscountAmount: number;
  addonsCost: number;
  insuranceCost: number;
  managementFee: number;
  serviceFee: number;
  couponDiscount: number;
  subtotal: number;
  grandTotal: number;
  depositAmount?: number;
}

export interface RowTemplate {
  id: string;
  name: string;
  description?: string;
  price_per_month: number;
  area_sqm?: number;
  is_available: boolean;
  position?: string;
}

export interface CouponValidationRequest {
  code: string;
  warehouse_template_id?: string;
  row_template_ids?: string[];
  total_amount: number;
  duration_value: number;
  duration_unit: string;
}

export interface CouponValidationResult {
  is_valid: boolean;
  coupon?: Coupon;
  discount_amount: number;
  message?: string;
  gift_addons?: string[];
  gift_insurances?: string[];
}


export interface BookingConfiguration {
  warehouseTemplateId: string;
  rentalType: "whole" | "row";
  selectedRowIds?: string[];
  durationTierId: string;
  durationMonths: number;
  startDate: Date;
  selectedAddonIds: string[];
  insuranceId?: string;
  couponCode?: string;
  quotation: QuotationBreakdown;
}

export const MOCK_DURATION_TIERS: Array<{
  id: string;
  name: string;
  duration_value: number;
  duration_unit: DurationUnit;
  description: string;
  order: number;
  discount_percent: number;
  is_active: boolean;
  gift_insurance?: boolean;
}> = [
    {
      id: "tier-1m",
      name: "1 Tháng",
      duration_value: 1,
      duration_unit: "MONTH",
      description: "Linh hoạt, phù hợp thử nghiệm",
      order: 1,
      discount_percent: 0,
      is_active: true,
    },
    {
      id: "tier-6m",
      name: "6 Tháng",
      duration_value: 6,
      duration_unit: "MONTH",
      description: "Gói tiêu chuẩn",
      order: 2,
      discount_percent: 0,
      is_active: true,
    },
    {
      id: "tier-12m",
      name: "1 Năm",
      duration_value: 12,
      duration_unit: "MONTH",
      description: "Giảm 5% tổng giá thuê",
      order: 3,
      discount_percent: 5,
      is_active: true,
    },
    {
      id: "tier-24m",
      name: "2 Năm",
      duration_value: 24,
      duration_unit: "MONTH",
      description: "Giảm 10% + Tặng Bảo hiểm cơ bản",
      order: 4,
      discount_percent: 10,
      gift_insurance: true,
      is_active: true,
    },
  ];

export const MOCK_ADDONS = [
  {
    id: "addon-forklift",
    name: "Xe nâng & Bốc xếp",
    description: "Hỗ trợ bốc xếp hàng hóa khi nhập/xuất kho",
    price: 2000000,
    is_monthly_payment: true,
    is_active: true,
  },
  {
    id: "addon-security",
    name: "Bảo vệ riêng 24/7",
    description: "Nhân viên bảo vệ chuyên trách cho khu vực của bạn",
    price: 2000000,
    is_monthly_payment: true,
    is_active: true,
  },
  {
    id: "addon-cleaning",
    name: "Dịch vụ vệ sinh",
    description: "Vệ sinh định kỳ khu vực kho",
    price: 200000,
    is_monthly_payment: false,
    is_active: true,
  },
];

export const MOCK_INSURANCES = [
  {
    id: "ins-none",
    name: "Không tham gia bảo hiểm",
    description: "Khách hàng tự chịu rủi ro về hàng hóa",
    price: "0",
    use_management_fee: false,
    management_fee_type: "FIXED",
    management_fee_value: "0",
    is_active: true,
  },
  {
    id: "ins-basic",
    name: "Bảo hiểm cơ bản",
    description: "Bảo vệ giá trị đến 500 triệu",
    price: "500000",
    use_management_fee: false,
    management_fee_type: "FIXED",
    management_fee_value: "0",
    is_active: true,
  },
  {
    id: "ins-standard",
    name: "Bảo hiểm tiêu chuẩn",
    description: "Đền bù 100% + Phí quản lý",
    price: "800000",
    use_management_fee: true,
    management_fee_type: "FIXED",
    management_fee_value: "50000",
    is_active: true,
  },
  {
    id: "ins-premium",
    name: "Bảo hiểm cao cấp",
    description: "Toàn diện (VIP) - Bảo vệ mọi rủi ro",
    price: "1100000",
    use_management_fee: true,
    management_fee_type: "PERCENT",
    management_fee_value: "10",
    is_active: true,
  },
];

export const MOCK_ROWS = [
  {
    id: "row-a",
    name: "Dãy A",
    description: "Gần cửa kho, thuận tiện xuất/nhập",
    price_per_month: 5000000,
    area_sqm: 50,
    is_available: true,
    position: "Cửa trước",
  },
  {
    id: "row-b",
    name: "Dãy B",
    description: "Giữa kho, yên tĩnh",
    price_per_month: 4500000,
    area_sqm: 50,
    is_available: true,
    position: "Giữa kho",
  },
  {
    id: "row-c",
    name: "Dãy C",
    description: "Khu vực nhiệt độ thấp",
    price_per_month: 6000000,
    area_sqm: 45,
    is_available: false,
    position: "Khu mát",
  },
];
