const API = process.env.NEXT_PUBLIC_API_URL;

export interface Payment {
    payment_code: string;
    amount: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
    qr_code?: string;
    expired_at?: string;
    contract_id?: string;
}

export class PaymentService {
    
    /**
     * Lấy thông tin thanh toán theo mã
     * @param paymentCode Mã thanh toán
     * @returns Thông tin thanh toán
     */
    async getPaymentByCode(paymentCode: string): Promise<Payment> {
        // Public endpoint, likely no auth needed for getting basic info, but usually auth is good practice if protected
        // Based on controller, it is not marked @Public() except webhook/callback. 
        // Wait, controller has @Controller('payment') and NO global guard on class level (unlike AccountBalanceController).
        // It seems getPayment might be public or require auth depending on global config.
        // Assuming public for lookup by unique code, or requires token if user context needed.
        // I will add token support just in case.
        
        const response = await fetch(`${API}/payment/${paymentCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch payment');
        }

        const data = await response.json();
        return data.data;
    }
}

export const paymentService = new PaymentService();
