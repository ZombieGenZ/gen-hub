import { BalanceTransactionType } from '@prisma/client';

/**
 * Interface cho OrganizationBalance (số dư tổ chức)
 */
export interface IOrganizationBalance {
  id: string;
  organization_id: string;
  balance: number;
  total_deposited: number;
  total_spent: number;
  total_refunded: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date | null;
  is_deleted: boolean | null;
  deleted_at: Date | null;
  organization?: {
    id: string;
    name: string;
  };
}

/**
 * Interface cho OrganizationBalanceTransaction (giao dịch số dư tổ chức)
 */
export interface IOrganizationBalanceTransaction {
  id: string;
  organization_balance_id: string;
  organization_id: string;
  performed_by_user_id: string | null;
  type: BalanceTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  performed_by_user?: {
    id: string;
    name: string;
  };
}

/**
 * Interface cho paginated response
 */
export interface IPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  hasPrevious?: boolean; // Sometimes helpful to add but stick to old interface
}
