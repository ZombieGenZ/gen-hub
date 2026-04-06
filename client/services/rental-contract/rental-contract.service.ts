import {
    CreateRentalContractRequest,
    UpdateRentalContractRequest,
    CancelContractRequest,
    CancelManyContractsRequest,
} from '../../types/rental-contracts/rental-contracts.type'

const API = process.env.NEXT_PUBLIC_API_URL

export class RentalContractService {

    /**
     * Danh sách hợp đồng
     * @param token Token truy cập
     * @param params Các tham số lọc
     * @returns Danh sách hợp đồng (PaginatedData)
     */
    async getRentalContracts(token: string, params: {
        keywords?: string;
        status?: string;
        organization_id?: string;
        page?: number;
        limit?: number;
    } = {}) {
        const query = new URLSearchParams();

        if (params.keywords) query.append('keywords', params.keywords);
        if (params.status && params.status !== 'all') query.append('status', params.status);
        if (params.organization_id) query.append('organization_id', params.organization_id);

        if (params.limit) query.append('limit', String(params.limit));
        if (params.page && params.page > 0) {
            const offset = (params.page - 1) * (params.limit || 10);
            query.append('offset', String(offset));
        }

        const response = await fetch(`${API}/rental-contracts?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Tạo hợp đồng mới (Admin)
     */
    async createRentalContract(token: string, data: CreateRentalContractRequest) {
        const response = await fetch(`${API}/rental-contracts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Khách hàng tạo hợp đồng mới (Dùng Org endpoint)
     */
    async createOrgRentalContract(token: string, orgId: string, data: CreateRentalContractRequest, signatureBlob?: Blob | null) {
        const formData = new FormData();

        formData.append('duration_tier_id', data.duration_tier_id);
        if (data.payment_method) formData.append('payment_method', data.payment_method);
        if (data.auto_renew !== undefined) formData.append('auto_renew', String(data.auto_renew));
        if (data.notes) formData.append('notes', data.notes);
        if (data.scheduled_start_at) formData.append('scheduled_start_at', data.scheduled_start_at);

        if (data.templates?.length) {
            formData.append('templates', JSON.stringify(data.templates));
        }

        data.addon_ids?.forEach(id => formData.append('addon_ids', id));
        data.insurance_ids?.forEach(id => formData.append('insurance_ids', id));
        data.coupon_codes?.forEach(code => formData.append('coupon_codes', code));

        if (signatureBlob) {
            formData.append('signature', signatureBlob, 'signature.png');
        }

        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const detail = errorData.errors?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join('; ');
            const baseMessage = detail ? `${errorData.message} (${detail})` : errorData.message || 'Không thể tạo hợp đồng';
            // Gắn code vào message để caller có thể detect loại lỗi chính xác
            const errorCode = errorData.code ? `[${errorData.code}] ` : '';
            throw new Error(`${errorCode}${baseMessage}`);
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết hợp đồng theo ID
     */
    async getRentalContractById(token: string, id: string) {
        const response = await fetch(`${API}/rental-contracts/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật hợp đồng
     */
    async updateRentalContract(token: string, id: string, data: UpdateRentalContractRequest) {
        const response = await fetch(`${API}/rental-contracts/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Hủy hợp đồng
     */
    async cancelRentalContract(token: string, id: string, data: CancelContractRequest) {
        const response = await fetch(`${API}/rental-contracts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể hủy hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Hủy nhiều hợp đồng
     */
    async cancelManyRentalContracts(token: string, data: CancelManyContractsRequest) {
        const response = await fetch(`${API}/rental-contracts/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể hủy các hợp đồng đã chọn');
        }

        const res = await response.json();
        return res.data;
    }

    // ==================== ORG-LEVEL ENDPOINTS ====================
    // Route: /organizations/:orgId/rental-contracts

    /**
     * Lấy danh sách hợp đồng của tổ chức (Org endpoint)
     * GET /organizations/:orgId/rental-contracts
     */
    async getOrgRentalContracts(token: string, orgId: string, params: {
        keywords?: string;
        status?: string;
        page?: number;
        limit?: number;
    } = {}) {
        const query = new URLSearchParams();

        if (params.keywords) query.append('keywords', params.keywords);
        if (params.status && params.status !== 'all') query.append('status', params.status);

        if (params.limit) query.append('limit', String(params.limit));
        if (params.page && params.page > 0) {
            const offset = (params.page - 1) * (params.limit || 10);
            query.append('offset', String(offset));
        }

        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết hợp đồng (Org endpoint)
     * GET /organizations/:orgId/rental-contracts/:id
     */
    async getOrgRentalContractById(token: string, orgId: string, id: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết hợp đồng đầy đủ (có addons, logs, coupons)
     * GET /organizations/:orgId/rental-contracts/:id/full
     */
    async getOrgRentalContractFull(token: string, orgId: string, id: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/full`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy chi tiết đầy đủ hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Gia hạn hợp đồng (Org endpoint)
     * PUT /organizations/:orgId/rental-contracts/:id/renew
     */
    async renewOrgRentalContract(token: string, orgId: string, id: string, data: {
        duration_tier_id: string;
        addon_ids?: string[];
        insurance_ids?: string[];
        coupon_codes?: string[];
        auto_renew?: boolean;
    }, signatureBlob?: Blob | null) {
        const formData = new FormData();

        formData.append('duration_tier_id', data.duration_tier_id);
        if (data.auto_renew !== undefined) formData.append('auto_renew', String(data.auto_renew));

        data.addon_ids?.forEach(id => formData.append('addon_ids', id));
        data.insurance_ids?.forEach(id => formData.append('insurance_ids', id));
        data.coupon_codes?.forEach(code => formData.append('coupon_codes', code));

        if (signatureBlob) {
            formData.append('signature', signatureBlob, 'signature.png');
        }

        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/renew`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gia hạn hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Tạo lại link thanh toán cho hợp đồng PENDING
     * POST /organizations/:orgId/rental-contracts/:id/retry-payment
     */
    async retryPayment(token: string, orgId: string, id: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/retry-payment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo lại link thanh toán');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Gửi hợp đồng qua DocuSign để ký điện tử
     * POST /organizations/:orgId/rental-contracts/:id/send-docusign
     */
    async sendDocusign(token: string, orgId: string, id: string, returnUrl: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/send-docusign`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ return_url: returnUrl }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể gửi DocuSign');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách addons của hợp đồng
     * GET /organizations/:orgId/rental-contracts/:id/addons
     */
    async getContractAddons(token: string, orgId: string, id: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/addons`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách addon');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy danh sách insurances của hợp đồng
     * GET /organizations/:orgId/rental-contracts/:id/insurances
     */
    async getContractInsurances(token: string, orgId: string, id: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/insurances`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách bảo hiểm');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy logs của hợp đồng
     * GET /organizations/:orgId/rental-contracts/:id/logs
     */
    async getContractLogs(token: string, orgId: string, id: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}/logs`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy lịch sử hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Hủy hợp đồng (Org endpoint)
     * DELETE /organizations/:orgId/rental-contracts/:id
     */
    async cancelOrgRentalContract(token: string, orgId: string, id: string, cancelReason: string) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cancel_reason: cancelReason }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể hủy hợp đồng');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Hủy nhiều hợp đồng (Org endpoint)
     * DELETE /organizations/:orgId/rental-contracts/delete/many
     */
    async cancelManyOrgRentalContracts(token: string, orgId: string, items: { id: string; cancel_reason: string }[]) {
        const response = await fetch(`${API}/organizations/${orgId}/rental-contracts/delete/many`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể hủy các hợp đồng đã chọn');
        }

        const res = await response.json();
        return res.data;
    }
}

export const rentalContractService = new RentalContractService();
