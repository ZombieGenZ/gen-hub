import { RentalDurationTier } from '@prisma/client';

/**
 * RentalDurationTier interface
 */
export interface IRentalDurationTier extends RentalDurationTier { }

/**
 * Response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}
