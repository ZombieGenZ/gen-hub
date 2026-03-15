export interface PaymentList {
    id: string;
    payment_code: string;
    amount: number;
    status: string;
    payment_method: string;
    organization_id: string;
    organization: {
        id: string;
        name: string;
    };
    reference_type: string;
    reference_id: string;
    description: string;
    paid_at: string;
    created_at: string;
}

export interface AcceptPaymentResponse {
    paymentId: string;
    message: string;
}

export interface RejectPaymentResponse {
    paymentId: string;
    message: string;
}