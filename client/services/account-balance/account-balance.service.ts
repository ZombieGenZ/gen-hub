const API = process.env.NEXT_PUBLIC_API_URL;

export interface OrganizationBalance {
    id: string;
    organization_id: string;
    balance: number;
    total_deposited: number;
    total_spent: number;
    total_refunded: number;
    updated_at: string;
}

export interface OrganizationBalanceTransaction {
    id: string;
    organization_balance_id: string;
    organization_id: string;
    type: 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
    amount: number;
    balance_before: number;
    balance_after: number;
    description: string;
    created_at: string;
    reference_type?: string;
    reference_id?: string;
}

export class AccountBalanceService {
    /**
     * Lấy số dư của tổ chức
     * @param token Token truy cập
     * @param orgId ID của tổ chức
     * @returns Thông tin số dư tổ chức
     */
    async getOrganizationBalance(token: string, orgId: string): Promise<OrganizationBalance> {
        const response = await fetch(`${API}/admin/organization-balances/${orgId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch balance');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Lấy lịch sử giao dịch của tổ chức
     * @param token Token truy cập
     * @param orgId ID của tổ chức
     * @param params Các tham số lọc giao dịch (trang, giới hạn, loại, ngày,...)
     * @returns Danh sách lịch sử giao dịch
     */
    async getTransactions(token: string, orgId: string, params: {
        page?: number;
        limit?: number;
        type?: string;
        from_date?: string;
        to_date?: string;
        description?: string;
        status?: string;
    } = {}) {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.type) query.append('type', params.type);
        if (params.from_date) query.append('from_date', params.from_date);
        if (params.to_date) query.append('to_date', params.to_date);
        if (params.description) query.append('description', params.description);
        if (params.status) query.append('status', params.status);

        const response = await fetch(`${API}/organizations/${orgId}/balance/transactions?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch transactions');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Tạo yêu cầu nạp tiền
     * @param token Token truy cập
     * @param orgId ID của tổ chức
     * @param amount Số tiền nạp
     * @param notes Ghi chú (tùy chọn)
     * @returns Thông tin giao dịch nạp tiền (bao gồm mã QR nếu có)
     */
    async createDeposit(token: string, orgId: string, amount: number, notes?: string) {
        const response = await fetch(`${API}/organizations/${orgId}/balance/deposit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ amount, notes }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create deposit');
        }

        const data = await response.json();
        return data.data; // Likely returns Sepay payment info/QR
    }
}

export const accountBalanceService = new AccountBalanceService();
