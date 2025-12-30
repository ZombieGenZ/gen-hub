export interface AddonRequest {
    name: string;
    description: string;
    price: number;
    is_monthly_payment: boolean;
    is_active: boolean;
}

export interface AddonResponse extends AddonRequest {
    id: number;
    created_at: string;
    updated_at: string;
}