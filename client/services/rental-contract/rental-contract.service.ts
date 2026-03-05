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
     * @returns Danh sách hợp đồng
     */
    async getRentalContracts(token: string, params: {
        keywords?: string;
        status?: string;
        organization_id?: string;
        page?: number;
        limit?: number;
    } = {}) {
        try {
            const query = new URLSearchParams();

            if (params.keywords) query.append('keywords', params.keywords);
            if (params.status && params.status !== 'all') query.append('status', params.status);
            if (params.organization_id) query.append('organization_id', params.organization_id);

            // Pagination
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
            })
            const data = await response.json()
            if (data.success) {
                return data.data
            } else {
                console.error('Get rental contracts error:', data)
                throw new Error(data.message || 'Get rental contracts failed')
            }
        } catch (error) {
            console.error('Get rental contracts error:', error)
            throw error
        }
    }

    /**
     * Tạo hợp đồng mới
     * @param token Token truy cập
     * @param data Dữ liệu hợp đồng
     * @returns Kết quả tạo hợp đồng
     */
    async createRentalContract(token: string, data: CreateRentalContractRequest) {
        try {
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
                throw new Error(errorData.message || 'Failed to create rental contract');
            }

            return await response.json();
        } catch (error) {
            console.error('Create rental contract error:', error);
            throw error;
        }
    }

    /**
     * Khách hàng tạo hợp đồng mới (Dùng Org endpoint)
     * @param token Token truy cập
     * @param orgId ID tổ chức
     * @param data Dữ liệu hợp đồng
     * @param signatureBlob Chữ ký điện tử dưới dạng Blob (optional)
     * @returns Kết quả tạo hợp đồng
     */
    async createOrgRentalContract(token: string, orgId: string, data: CreateRentalContractRequest, signatureBlob?: Blob | null) {
        try {
            // Build multipart/form-data because the endpoint uses FileInterceptor('signature')
            const formData = new FormData();

            // Append all scalar fields
            formData.append('duration_tier_id', data.duration_tier_id);
            // Note: organization_id is read from the URL path (:orgId), not the body
            if (data.payment_method) formData.append('payment_method', data.payment_method);
            if (data.auto_renew !== undefined) formData.append('auto_renew', String(data.auto_renew));
            if (data.notes) formData.append('notes', data.notes);
            if (data.scheduled_start_at) formData.append('scheduled_start_at', data.scheduled_start_at);

            // Serialize templates as a JSON string so the server can JSON.parse it
            if (data.templates?.length) {
                formData.append('templates', JSON.stringify(data.templates));
            }

            // Append simple arrays as repeated keys (no [] suffix so names match DTO fields)
            data.addon_ids?.forEach(id => formData.append('addon_ids', id));
            data.insurance_ids?.forEach(id => formData.append('insurance_ids', id));
            data.coupon_codes?.forEach(code => formData.append('coupon_codes', code));

            // Attach signature file if provided
            if (signatureBlob) {
                formData.append('signature', signatureBlob, 'signature.png');
            }

            const response = await fetch(`${API}/organizations/${orgId}/rental-contracts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Do NOT set Content-Type — browser will set multipart boundary automatically
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const detail = errorData.errors?.map((e: { field: string; message: string }) => `${e.field}: ${e.message}`).join('; ');
                throw new Error(detail ? `${errorData.message} (${detail})` : errorData.message || 'Failed to create org rental contract');
            }

            return await response.json();
        } catch (error) {
            console.error('Create org rental contract error:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết hợp đồng theo ID
     * @param token Token truy cập
     * @param id ID của hợp đồng
     * @returns Chi tiết hợp đồng
     */
    async getRentalContractById(token: string, id: string) {
        try {
            const response = await fetch(`${API}/rental-contracts/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to get contract detail');
            }

            return response.json();
        } catch (error) {
            console.error('Get rental contract detail error:', error)
            throw error
        }
    }

    /**
     * Cập nhật hợp đồng (gia hạn, thay đổi addon/bảo hiểm, ghi chú...)
     * PUT /rental-contracts/:id
     */
    async updateRentalContract(token: string, id: string, data: UpdateRentalContractRequest) {
        try {
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
                throw new Error(errorData.message || 'Failed to update rental contract');
            }

            return await response.json();
        } catch (error) {
            console.error('Update rental contract error:', error);
            throw error;
        }
    }

    /**
     * Hủy hợp đồng
     * DELETE /rental-contracts/:id
     */
    async cancelRentalContract(token: string, id: string, data: CancelContractRequest) {
        try {
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
                throw new Error(errorData.message || 'Failed to cancel rental contract');
            }

            return await response.json();
        } catch (error) {
            console.error('Cancel rental contract error:', error);
            throw error;
        }
    }

    /**
     * Hủy nhiều hợp đồng cùng lúc
     * DELETE /rental-contracts/delete/many
     */
    async cancelManyRentalContracts(token: string, data: CancelManyContractsRequest) {
        try {
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
                throw new Error(errorData.message || 'Failed to cancel contracts');
            }

            return await response.json();
        } catch (error) {
            console.error('Cancel many rental contracts error:', error);
            throw error;
        }
    }
}

export const rentalContractService = new RentalContractService();
