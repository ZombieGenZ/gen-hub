export interface PaymentResponse {
    paymentId: string;
    paymentCode: string;
    amount: number;
    qrCode: string;
    status: string;
    expiredAt: string;
    bankInfo: BankInfo;
}

interface BankInfo {
    accountNumber: string;
    bankName: string;
    accountHolder: string;
    transferContent: string;
}

export interface PaymentWebhookPayload {
    id: number;
    paymentId: string;
    status: string;
    gateway: string;
    transactionDate: string;
    accountNumber: string;
    subAccount: string;
    code: string;
    content: string;
    transferType: string;
    transferAmount: number;
    accumulated: number;
    referenceCode: string;
    description: string;
}

export interface PaymentHookResponse {
    success: boolean;
    message: string;
}

// Các interface khác liên quan đến thanh toán có thể được thêm vào đây, ví dụ như:
export interface PaymentCallbackData {
    paymentCode: string;
    amount: number;
    status: string;
    contractId: string;
}

export interface PaymentCancelResponse {
    success: boolean;
    message: string;
}