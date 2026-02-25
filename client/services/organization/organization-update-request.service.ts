const API = process.env.NEXT_PUBLIC_API_URL;

export interface OrgUpdateRequest {
    id: string;
    organization_id: string;
    organization?: {
        id: string;
        name: string;
        tax_code?: string;
        representative_name?: string;
    };
    tax_code?: string;
    headquarters_address?: string;
    representative_name?: string;
    representative_title?: string;
    representative_phone?: string;
    representative_email?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reject_reason?: string;
    requester_id: string;
    requester?: {
        id: string;
        email: string;
        full_name?: string;
    };
    created_at: string;
    updated_at?: string;
}

export interface OrgUpdateRequestListResponse {
    items: OrgUpdateRequest[];
    total: number;
    limit: number;
    offset: number;
}

export class OrganizationUpdateRequestService {
    async getAll(token: string, params: {
        limit?: number;
        offset?: number;
        status?: 'PENDING' | 'APPROVED' | 'REJECTED';
        keyword?: string;
    } = {}): Promise<OrgUpdateRequestListResponse> {
        const query = new URLSearchParams();
        if (params.limit !== undefined) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.status) query.append('status', params.status);
        if (params.keyword) query.append('keyword', params.keyword);

        const response = await fetch(`${API}/organization-update-requests?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to fetch organization update requests');
        }
        const data = await response.json();
        return data.data;
    }

    async getById(token: string, id: string): Promise<OrgUpdateRequest> {
        const response = await fetch(`${API}/organization-update-requests/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to fetch update request');
        }
        const data = await response.json();
        return data.data;
    }

    async approve(token: string, id: string): Promise<OrgUpdateRequest> {
        const response = await fetch(`${API}/organization-update-requests/${id}/approve`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to approve update request');
        }
        const data = await response.json();
        return data.data;
    }

    async reject(token: string, id: string, reject_reason: string): Promise<OrgUpdateRequest> {
        const response = await fetch(`${API}/organization-update-requests/${id}/reject`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reject_reason }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || 'Failed to reject update request');
        }
        const data = await response.json();
        return data.data;
    }
}
