import { Prisma } from '@prisma/client';
import Decimal = Prisma.Decimal;
import { IPaginatedResponse } from '../../../common/interfaces';

/**
 * Interface Addon
 */
export interface IAddon {
    id: string;
    name: string;
    description: string | null;
    price: Decimal;
    is_monthly_payment: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    is_deleted: boolean | null;
    deleted_at: Date | null;
    created_by: string;
    updated_by: string | null;
    deleted_by: string | null;
}

export type { IPaginatedResponse };
