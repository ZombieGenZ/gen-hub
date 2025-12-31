import { Prisma } from '@prisma/client';
import Decimal = Prisma.Decimal;
import { IPaginatedResponse } from '../../../common/interfaces';
import { ManagementFeeType } from '@prisma/client';

/**
 * Interface Insurance - Bảo hiểm
 */
export interface IInsurance {
    id: string;
    name: string;
    description: string | null;
    price: Decimal;
    use_management_fee: boolean;
    management_fee_type: ManagementFeeType | null;
    management_fee_value: Decimal | null;
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
