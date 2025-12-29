import { BalanceTransactionType } from '@prisma/client';

/**
 * Interface cho AccountBalance
 */
export interface IAccountBalance {
    id: string;
    user_id: string;
    balance: number;
    total_deposited: number;
    total_spent: number;
    total_refunded: number;
    is_active: boolean;
    created_at: Date;
    updated_at: Date | null;
    is_deleted: boolean | null;
    deleted_at: Date | null;
    user?: {
        id: string;
        name: string;
        email: string | null;
    };
}

/**
 * Interface cho BalanceTransaction
 */
export interface IBalanceTransaction {
    id: string;
    account_balance_id: string;
    user_id: string;
    type: BalanceTransactionType;
    amount: number;
    balance_before: number;
    balance_after: number;
    reference_type: string | null;
    reference_id: string | null;
    description: string | null;
    notes: string | null;
    metadata: Record<string, unknown> | null;
    created_at: Date;
}

/**
 * Interface cho paginated response
 */
export interface IPaginatedResponse<T> {
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}
