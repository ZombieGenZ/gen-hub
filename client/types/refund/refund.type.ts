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
    payment_id: string;
    amount: number;
    reason: string;
    status: RefundStatus;
    process_notes?: string;
    reject_reason?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateRefundRequestPayload {
    payment_id: string;
    amount: number;
    reason: string;
}

export interface ProcessRefundPayload {
    status: RefundStatus;
    process_notes?: string;
}
