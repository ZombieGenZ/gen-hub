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