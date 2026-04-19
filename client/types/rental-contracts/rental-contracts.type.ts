export interface RentalTemplateItemDto {
    template_id: string;
    warehouse_name: string;
    warehouse_description?: string;
    contents_description?: string;
    row_template_ids?: string[];
}

export type RentalContractPaymentType = 'TRANSFER' | 'CASH';
export type RentalContractPaymentMethod = 'BALANCE' | 'TRANSFER' | 'HYBRID';

export type ContractStatus =
    | 'PENDING'
    | 'ACTIVE'
    | 'OVERDUE_LEVEL_1'
    | 'OVERDUE_LEVEL_2'
    | 'OVERDUE_LEVEL_3'
    | 'SEALED'
    | 'LIQUIDATED'
    | 'CANCELLED'
    | 'COMPLETED';

export type ContractCancelType =
    | 'CLIENT_REQUEST'
    | 'ADMIN_REQUEST'
    | 'VIOLATION'
    | 'NON_PAYMENT'
    | 'SYSTEM';

export interface CreateRentalContractRequest {
    duration_tier_id: string;
    organization_id: string;
    templates: RentalTemplateItemDto[];
    type?: RentalContractPaymentType;
    addon_ids?: string[];
    auto_renew?: boolean;
    coupon_codes?: string[];
    insurance_ids?: string[];
    notes?: string;
    payment_method?: RentalContractPaymentMethod;
    scheduled_start_at?: string;
    signature?: File | Blob;
}

export interface UpdateRentalContractRequest {
    name?: string;
    notes?: string;
    extend_duration_tier_id?: string;
    reduce_months?: number;
    addon_ids?: string[];
    insurance_ids?: string[];
}

export interface CancelContractRequest {
    cancel_type: ContractCancelType;
    cancel_reason: string;
}

export interface CancelManyItem {
    id: string;
    cancel_type: ContractCancelType;
    cancel_reason: string;
}

export interface CancelManyContractsRequest {
    items: CancelManyItem[];
}

/* ---------- Response types ---------- */

export interface RentalContractListItem {
    id: string;
    code: string;
    name: string;
    status: ContractStatus;
    total_price: number | string;
    final_price: number | string;
    started_at: string;
    expired_at: string;
    auto_renew: boolean;
    created_at: string;
    organization?: {
        id: string;
        name: string;
        logo_url?: string;
    };
    warehouses?: {
        id: string;
        name: string;
    }[];
    details?: {
        id: string;
        warehouse_name?: string | null;
        warehouse_template?: {
            id: string;
            name: string;
            images?: {
                id: string;
                url: string;
                thumbnail_url?: string;
                order: number;
            }[];
        } | null;
        warehouse?: {
            id: string;
            name: string;
        } | null;
    }[];
}

export interface RentalContractDetail extends RentalContractListItem {
    notes?: string;
    cancel_type?: ContractCancelType;
    cancel_reason?: string;
    cancelled_at?: string;
    discount_rate?: number;
    vat_rate?: number;
    vat_amount?: number;
    payment_method?: RentalContractPaymentMethod;
    addons?: { id: string; name: string; price?: number; is_gift?: boolean }[];
    insurances?: { id: string; name: string; price?: number }[];
    warehouses?: {
        id: string;
        name: string;
        rows?: { id: string; name: string }[];
    }[];
    payments?: {
        id: string;
        amount: number;
        status: "PAID" | "PENDING" | "FAILED" | "REFUNDED" | "CANCELLED";
        method: "CASH" | "TRANSFER" | "CARD" | "WALLET";
        transaction_code?: string;
        paid_at?: string;
        created_at: string;
        description?: string;
        payment_url?: string;
        qr_code?: string;
        qr_code_url?: string;
        expired_at?: string;
    }[];
    history?: {
        id: string;
        type: string;
        description: string;
        created_at: string;
        actor?: { name: string; role?: string };
        metadata?: Record<string, unknown>;
    }[];
    signers?: {
        name: string;
        role: string;
        signed: boolean;
        signedAt?: string;
        avatar?: string;
    }[];
}

export interface RentalContractListResponse {
    items: RentalContractListItem[];
    total: number;
    limit: number;
    offset: number;
}
