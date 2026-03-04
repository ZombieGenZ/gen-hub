const API = process.env.NEXT_PUBLIC_API_URL;

export interface OrganizationBalance {
    id: string;
    organization_id: string;
    balance: number;
    total_deposited: number;
    total_spent: number;
    total_refunded: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    deleted_at: string | null;
    organization: {
        id: string;
        name: string;
    };
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

export interface TransactionListResponse {
    items: OrganizationBalanceTransaction[];
    total: number;
    limit?: number;
    offset?: number;
    page?: number;
}

export class AccountBalanceService {
    /**
     * Lấy số dư của tổ chức
     * @param token Token truy cập
     * @param orgId ID của tổ chức
     * @returns Thông tin số dư tổ chức
     */
    async getOrganizationBalance(token: string, orgId: string): Promise<OrganizationBalance> {
        console.log(`[AccountBalanceService] Fetching balance for org: ${orgId}`);
        const response = await fetch(`${API}/organizations/${orgId}/balance`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error(`[AccountBalanceService] Failed to fetch balance for org: ${orgId}`, error);
            throw new Error(error.message || 'Failed to fetch balance');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Lấy lịch sử giao dịch của tổ chức
     * @param token Token truy cập
     * @param orgId ID của tổ chức
     * @param params Các tham số lọc giao dịch (limit, offset, page, type, keywords)
     * @returns Danh sách lịch sử giao dịch
     */
    async getTransactions(token: string, orgId: string, params: {
        page?: number;
        limit?: number;
        offset?: number;
        type?: 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
        keywords?: string;
        description?: string; // mapped to keywords
    } = {}) {
        const query = new URLSearchParams();
        
        // 1. Calculate pagination (Backend strictly uses limit & offset)
        const limit = params.limit || 20;
        let offset = 0;
        if (params.offset !== undefined) {
            offset = params.offset;
        } else if (params.page !== undefined) {
            offset = (params.page - 1) * limit;
        }

        query.append('limit', String(limit));
        query.append('offset', String(offset));
        
        // 2. Filter by type (ensure it matches backend enum)
        if (params.type) {
            query.append('type', params.type);
        }
        
        // 3. Search keywords (backend uses 'keywords')
        const searchStr = params.keywords || params.description;
        if (searchStr) {
            query.append('keywords', searchStr);
        }

        // 4. Construct final URL (Ensure NO 'page' parameter is sent)
        const finalUrl = `${API}/organizations/${orgId}/balance/transactions?${query.toString()}`;
        console.log(`[AccountBalanceService] GET ${finalUrl}`);

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error(`[AccountBalanceService] Failed to fetch transactions for org: ${orgId}`, error);
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
