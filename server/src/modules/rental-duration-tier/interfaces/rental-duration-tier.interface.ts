import { RentalDurationTier } from '@prisma/client';

/**
 * RentalDurationTier interface
 */
export interface IRentalDurationTier extends RentalDurationTier { }

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
