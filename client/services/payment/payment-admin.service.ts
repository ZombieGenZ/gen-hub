const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';

export interface AdminPayment {
    id: string;
    payment_code: string;
    amount: number;
    status: PaymentStatus;
    payment_method: string;
    organization_id: string;
    organization?: {
        id: string;
        name: string;
    };
    reference_type?: string;
    reference_id?: string;
    description?: string;
    paid_at?: string | null;
    created_at: string;
}

export interface QueryPaymentParams {
    limit?: number;
    offset?: number;
    keywords?: string;
    status?: PaymentStatus;
    organizationId?: string;
}

export interface AdminPaymentListResult {
    items: AdminPayment[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

// ─── Service ─────────────────────────────────────────────

export class PaymentAdminService {
    /**
     * Lấy danh sách tất cả payments (Admin only)
     */
    async getAll(token: string, params?: QueryPaymentParams): Promise<AdminPaymentListResult> {
        const qp = new URLSearchParams();
        if (params) {
            if (params.limit !== undefined) qp.append('limit', params.limit.toString());
            if (params.offset !== undefined) qp.append('offset', params.offset.toString());
            if (params.keywords) qp.append('keywords', params.keywords);
            if (params.status) qp.append('status', params.status);
            if (params.organizationId) qp.append('organizationId', params.organizationId);
        }
        const response = await fetch(`${API}/admin/payments?${qp.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch payments');
        }
        return (await response.json()).data;
    }

    /**
     * Chủ động accept payment (Admin only)
     * Thực hiện toàn bộ logic như khi payment thực sự được hoàn thành
     */
    async manualAccept(token: string, paymentId: string) {
        const response = await fetch(`${API}/admin/payments/accept`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentId }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to accept payment');
        }
        return (await response.json()).data;
    }

    /**
     * Chủ động reject payment (Admin only)
     * Thực hiện toàn bộ logic như khi payment bị hủy/từ chối
     */
    async manualReject(token: string, paymentId: string) {
        const response = await fetch(`${API}/admin/payments/reject`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentId }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to reject payment');
        }
        return (await response.json()).data;
    }
}

export const paymentAdminService = new PaymentAdminService();
