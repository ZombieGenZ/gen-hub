/**
 * Interfaces cho PayOS payment
 */

// Response từ PayOS khi tạo payment link
export interface IPayOSCreatePaymentResponse {
    code: string;
    desc: string;
    data: {
        bin: string;
        accountNumber: string;
        accountName: string;
        amount: number;
        description: string;
        orderCode: number;
        currency: string;
        paymentLinkId: string;
        status: string;
        checkoutUrl: string;
        qrCode: string;
    };
    signature: string;
}

// Webhook data từ PayOS
export interface IPayOSWebhookData {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId: string;
    counterAccountBankName: string;
    counterAccountName: string;
    counterAccountNumber: string;
    virtualAccountName: string;
    virtualAccountNumber: string;
}

export interface IPayOSWebhook {
    code: string;
    desc: string;
    data: IPayOSWebhookData;
    signature: string;
}

// Item trong payment
export interface IPaymentItem {
    name: string;
    quantity: number;
    price: number;
}

// Options tạo payment link
export interface ICreatePaymentLinkOptions {
    orderCode: number;
    amount: number;
    description: string;
    items?: IPaymentItem[];
    cancelUrl: string;
    returnUrl: string;
    expiredAt?: number; // Unix timestamp
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
}

// Response khi tạo payment trong hệ thống
export interface IPaymentResult {
    paymentId: string;
    orderCode: number;
    amount: number;
    checkoutUrl: string;
    qrCode: string;
    status: string;
    expiredAt: Date;
}
