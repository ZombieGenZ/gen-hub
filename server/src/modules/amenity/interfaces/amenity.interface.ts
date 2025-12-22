import { Amenity } from '@prisma/client';

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';

/**
 * Amenity với relations
 */
export interface IAmenity extends Amenity { }
