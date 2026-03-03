const API = process.env.NEXT_PUBLIC_API_URL;

export interface OrgBalance {
    id: string;
    organization_id: string;
    organization?: {
        id: string;
        name: string;
    };
    balance: number;
    created_at: string;
    updated_at?: string;
}

export interface OrgBalanceTransaction {
    id: string;
    organization_id: string;
    amount: number;
    type: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT';
    description?: string;
    created_by?: string;
    created_at: string;
}

export interface OrgBalanceListResponse {
    items: OrgBalance[];
    total: number;
    limit: number;
    offset: number;
}

export class OrganizationBalanceAdminService {
    async getAll(token: string, params: {
        limit?: number;
        offset?: number;
        keywords?: string;
    } = {}): Promise<OrgBalanceListResponse> {
        console.log("[OrganizationBalanceAdminService] Fetching all balances with params:", params);
        const query = new URLSearchParams();
        if (params.limit !== undefined) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.keywords) query.append('keywords', params.keywords);

        const response = await fetch(`${API}/admin/organization-balances?${query}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error("[OrganizationBalanceAdminService] Failed to fetch organization balances:", err);
            throw new Error(err.message || 'Failed to fetch organization balances');
        }
        const data = await response.json();
        return data.data;
    }

    async getByOrganizationId(token: string, organizationId: string): Promise<OrgBalance> {
        console.log(`[OrganizationBalanceAdminService] Fetching balance for org: ${organizationId}`);
        const response = await fetch(`${API}/admin/organization-balances/${organizationId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error(`[OrganizationBalanceAdminService] Failed to fetch organization balance for ${organizationId}:`, err);
            throw new Error(err.message || 'Failed to fetch organization balance');
        }
        const data = await response.json();
        return data.data;
    }

    async adjustBalance(token: string, organizationId: string, body: {
        amount: number;
        type: 'CREDIT' | 'DEBIT';
        description?: string;
    }): Promise<{ balance: OrgBalance; transaction: OrgBalanceTransaction }> {
        console.log(`[OrganizationBalanceAdminService] Adjusting balance for org: ${organizationId}`, body);
        const response = await fetch(`${API}/admin/organization-balances/${organizationId}/adjust`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error(`[OrganizationBalanceAdminService] Failed to adjust balance for ${organizationId}:`, err);
            throw new Error(err.message || 'Failed to adjust balance');
        }
        const data = await response.json();
        return data.data;
    }
}
