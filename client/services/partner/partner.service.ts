const API = process.env.NEXT_PUBLIC_API_URL;

export class PartnerService {
    /**
     * Lấy danh sách đối tác (khách hàng)
     */
    async listPartners(token: string, params: {
        keywords?: string;
        page?: number;
        limit?: number;
        status?: string;
    } = {}) {
        const query = new URLSearchParams();
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.status) query.append('status', params.status);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));

        const response = await fetch(`${API}/customers?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách đối tác');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy chi tiết đối tác
     */
    async getPartnerById(token: string, id: string) {
        const response = await fetch(`${API}/customers/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin đối tác');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật thông tin đối tác
     */
    async updatePartner(token: string, id: string, data: any) {
        const response = await fetch(`${API}/customers/${id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật đối tác');
        }

        const res = await response.json();
        return res.data;
    }
}

export const partnerService = new PartnerService();
