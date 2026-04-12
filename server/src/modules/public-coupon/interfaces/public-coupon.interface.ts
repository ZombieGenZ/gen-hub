import { Prisma } from '@prisma/client';
import Decimal = Prisma.Decimal;
import { CouponDiscountType, DurationUnit } from '@prisma/client';
import { IPaginatedResponse } from '../../../common/interfaces';

/**
 * Interface Public Coupon
 */
export interface IPublicCoupon {
  id: string;
  name: string;
  description: string | null;
  code: string;

  discount_value: Decimal;
  discount_type: CouponDiscountType;

  // Điều kiện sử dụng
  require_min_warehouses: boolean;
  min_warehouses: number | null;

  require_min_rows: boolean;
  min_rows: number | null;

  require_min_order_amount: boolean;
  min_order_amount: Decimal | null;

  require_min_rental_duration: boolean;
  min_rental_duration_value: number | null;
  min_rental_duration_unit: DurationUnit | null;

  // Giới hạn giảm giá
  is_unlimited_discount: boolean;
  max_discount_amount: Decimal | null;

  // Thời gian hiệu lực
  is_permanent: boolean;
  starts_at: Date | null;
  ends_at: Date | null;

  // Số lượng sử dụng
  max_usage: number;
  current_usage: number;

  // Công khai và áp dụng
  is_public: boolean;
  apply_for_first_rental: boolean;
  apply_for_renewal: boolean;

  is_active: boolean;
  created_at: Date;
}

export type { IPaginatedResponse };
