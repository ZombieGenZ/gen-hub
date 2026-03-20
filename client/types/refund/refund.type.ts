export enum RefundStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export interface RefundRequest {
    id: string;
    organization_id: string;
    rental_contract_id: string;
    original_amount: number;
    fee_percent: number;
    fee_amount: number;
    final_refund_amount: number;
    reason: string;
    status: RefundStatus;
    process_notes?: string;
    created_at: string;
    updated_at: string;
    processed_at?: string;
    processed_by?: string;
}

export interface CreateRefundRequestPayload {
    rental_contract_id: string;
    original_amount: number;
    fee_percent: number;
    fee_amount: number;
    final_refund_amount: number;
    reason: string;
}

export interface ProcessRefundPayload {
    status: RefundStatus;
    process_notes?: string;
}
