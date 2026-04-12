import { ContactTag } from '@prisma/client';

/**
 * Interface cho ContactTag với relations
 */
export interface IContactTagWithRelations extends ContactTag {}

/**
 * Response phân trang cho ContactTag
 */
export interface IContactTagPaginatedResponse {
  items: IContactTagWithRelations[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
