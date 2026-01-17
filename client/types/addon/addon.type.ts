export interface AddonRequest {
    name: string;
    description: string;
    price: number;
    is_monthly_payment: boolean;
    is_active: boolean;
}

export interface AddonResponse{
    id: string,
    name: string,
    description: string,
    price: number,
    is_monthly_payment: boolean,
    is_active: boolean,
    created_at: string,
    updated_at?: string | null,
    is_deleted: boolean,
    deleted_at?: string | null,
    created_by: string,
    updated_by?: string | null,
    deleted_by?: string | null
}