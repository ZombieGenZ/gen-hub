const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────

export type ConsultationRequestStatus =
    | 'PENDING'
    | 'CONTACTED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED';

export type ConsultationRequestSource =
    | 'WEB_FORM'
    | 'AI_CHAT'
    | 'PHONE'
    | 'EMAIL'
    | 'OTHER';

export interface ConsultationRequest {
    id: string;
    code: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    position?: string | null;
    subject?: string | null;
    message?: string | null;
    warehouse_template_id?: string | null;
    source: ConsultationRequestSource;
    status: ConsultationRequestStatus;
    assigned_to?: string | null;
    staff_notes?: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface CreateConsultationRequestData {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    position?: string;
    subject?: string;
    message?: string;
    warehouse_template_id?: string;
    source?: ConsultationRequestSource;
}

export interface UpdateConsultationRequestData {
    status?: ConsultationRequestStatus;
    assigned_to?: string;
    staff_notes?: string;
}

export interface QueryConsultationRequestParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: ConsultationRequestStatus;
    source?: ConsultationRequestSource;
    assigned_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

// ─── Service ─────────────────────────────────────────────

export class ConsultationRequestService {
    /**
     * Tạo yêu cầu tư vấn (Public – không cần auth)
     */
    async create(data: CreateConsultationRequestData) {
        const response = await fetch(`${API}/consultation-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to create consultation request');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy danh sách yêu cầu tư vấn (Admin)
     */
    async getAll(token: string, params?: QueryConsultationRequestParams) {
        const qp = new URLSearchParams();
        if (params) {
            if (params.page !== undefined) qp.append('page', params.page.toString());
            if (params.limit !== undefined) qp.append('limit', params.limit.toString());
            if (params.search) qp.append('search', params.search);
            if (params.status) qp.append('status', params.status);
            if (params.source) qp.append('source', params.source);
            if (params.assigned_to) qp.append('assigned_to', params.assigned_to);
            if (params.sort_by) qp.append('sort_by', params.sort_by);
            if (params.sort_order) qp.append('sort_order', params.sort_order);
        }
        const response = await fetch(`${API}/consultation-request?${qp.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch consultation requests');
        }
        return (await response.json()).data;
    }

    /**
     * Lấy chi tiết yêu cầu tư vấn
     */
    async getById(token: string, id: string) {
        const response = await fetch(`${API}/consultation-request/${id}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch consultation request');
        }
        return (await response.json()).data;
    }

    /**
     * Cập nhật yêu cầu tư vấn (trạng thái, ghi chú, người phụ trách)
     */
    async update(token: string, id: string, data: UpdateConsultationRequestData) {
        const response = await fetch(`${API}/consultation-request/${id}`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to update consultation request');
        }
        return (await response.json()).data;
    }

    /**
     * Phân công nhân viên xử lý yêu cầu tư vấn
     */
    async assign(token: string, id: string, assignedTo: string) {
        const response = await fetch(`${API}/consultation-request/${id}/assign`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ assigned_to: assignedTo }),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to assign consultation request');
        }
        return (await response.json()).data;
    }

    /**
     * Xóa mềm yêu cầu tư vấn
     */
    async delete(token: string, id: string) {
        const response = await fetch(`${API}/consultation-request/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to delete consultation request');
        }
        return (await response.json()).data;
    }
}

export const consultationRequestService = new ConsultationRequestService();
