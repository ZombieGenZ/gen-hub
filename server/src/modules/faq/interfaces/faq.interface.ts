import { FAQ } from '@prisma/client';

/**
 * Interface cho FAQ với relations
 */
export interface IFaqWithRelations extends FAQ { }

/**
 * Response phân trang cho FAQ
 */
export interface IFaqPaginatedResponse {
    items: IFaqWithRelations[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
