const API = process.env.NEXT_PUBLIC_API_URL

export class WarehouseTemplateService {
    async getWarehouseTemplates(token: string, params: {
        keywords?: string;
        is_active?: boolean;
        rental_status?: string;
        province_id?: string;
        page?: number;
        limit?: number;
    } = {}) {
        const query = new URLSearchParams();

        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.rental_status) query.append('rental_status', params.rental_status);
        if (params.province_id) query.append('province_id', params.province_id);

        // Pagination
        if (params.limit) query.append('limit', String(params.limit));
        if (params.page && params.page > 0) {
            const offset = (params.page - 1) * (params.limit || 10);
            query.append('offset', String(offset));
        }

        const response = await fetch(`${API}/warehouse-templates?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse templates');
        }
        
        const data = await response.json();
        return data.data;
    }

    async getWarehouseTemplateById(token: string, id: string) {
        const response = await fetch(`${API}/warehouse-templates/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse template details');
        }
        
        const data = await response.json();
        return data.data;
    }
}