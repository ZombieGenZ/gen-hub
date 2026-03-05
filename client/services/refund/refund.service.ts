import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type { 
    RefundRequest, 
    CreateRefundRequestPayload, 
    ProcessRefundPayload 
} from '../../types/refund/refund.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class RefundService {

    // ==================== DÀNH CHO KHÁCH HÀNG (CUSTOMER) ====================

    /**
     * Tạo yêu cầu hoàn tiền
     */
    async createRequest(token: string, data: CreateRefundRequestPayload): Promise<ApiResponse<RefundRequest>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/refund-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Không thể gửi yêu cầu hoàn tiền');
        return await response.json();
    }

    /**
     * Lấy danh sách yêu cầu hoàn tiền của tổ chức
     */
    async listMyRequests(token: string): Promise<PaginatedResponse<RefundRequest>> {
        const orgId = await orgHelper.getOrgId(token);
        const response = await fetch(`${API}/organizations/${orgId}/refund-requests`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể lấy danh sách yêu cầu hoàn tiền');
        return await response.json();
    }

    // ==================== DÀNH CHO QUẢN TRỊ VIÊN (ADMIN) ====================

    /**
     * Admin lấy danh sách toàn bộ yêu cầu hoàn tiền
     */
    async adminListRequests(token: string, params: { status?: string; limit?: number; offset?: number } = {}): Promise<PaginatedResponse<RefundRequest>> {
        const query = new URLSearchParams();
        if (params.status) query.append('status', params.status);
        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset) query.append('offset', String(params.offset));

        const response = await fetch(`${API}/admin/refund-requests?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Không thể lấy danh sách yêu cầu hoàn tiền (Admin)');
        return await response.json();
    }

    /**
     * Admin xử lý yêu cầu hoàn tiền (Duyệt/Từ chối)
     */
    async adminProcessRequest(token: string, id: string, data: ProcessRefundPayload): Promise<ApiResponse<RefundRequest>> {
        const response = await fetch(`${API}/admin/refund-requests/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Không thể cập nhật trạng thái yêu cầu hoàn tiền');
        return await response.json();
    }
}

export const refundService = new RefundService();
