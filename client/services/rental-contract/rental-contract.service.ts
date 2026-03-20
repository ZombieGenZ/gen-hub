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
            throw new Error(detail ? `${errorData.message} (${detail})` : errorData.message || 'Không thể tạo hợp đồng');
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
}

export const rentalContractService = new RentalContractService();
