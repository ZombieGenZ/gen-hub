import { CustomerReview } from '@prisma/client';

export interface ICustomerReview extends CustomerReview {}

export interface ICustomerReviewPaginatedResponse {
  items: ICustomerReview[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
