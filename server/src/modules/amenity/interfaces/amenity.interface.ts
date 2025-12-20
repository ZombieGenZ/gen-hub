import { Amenity } from '@prisma/client';

/**
 * Amenity với relations
 */
export interface IAmenity extends Amenity { }

/**
 * Response phân trang
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
}
