import { RefundRequest, RentalContract, RefundStatus } from '@prisma/client';

/**
 * Interface cho RefundRequest với các relations
 */
export interface IRefundRequestWithRelations extends RefundRequest {
  rental_contract?: RentalContract & {
    code: string;
    name?: string | null;
  };
}

/**
 * Interface cho paginated response
 */
export interface IPaginatedRefundRequestResponse {
  items: IRefundRequestWithRelations[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Interface cho RefundRequest status change result
 */
export interface IRefundRequestStatusChangeResult {
  id: string;
  old_status: RefundStatus;
  new_status: RefundStatus;
  processed_by: string;
  processed_at: Date;
}
