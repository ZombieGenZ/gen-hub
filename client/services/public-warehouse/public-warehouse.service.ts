const API = process.env.NEXT_PUBLIC_API_URL;

export interface WarehouseImage {
    id: string;
    url: string;
    order: number;
}

export interface WarehouseAmenity {
    id: string;
    name: string;
    icon?: string;
    description?: string;
}

export interface WarehouseWard {
    id: string;
    name: string;
    district?: {
        id: string;
        name: string;
        province?: {
            id: string;
            name: string;
        };
    };
}

export interface PublicWarehouseListParams {
    keywords?: string;
    is_active?: boolean;
    province_id?: string;
    rental_status?: string;
    page?: number;
    limit?: number;
}

export class PublicWarehouseService {
    /**
     * Lấy danh sách kho (Public - không cần auth)
     * @param params Tham số lọc
     * @returns Danh sách kho
     */
    async getPublicWarehouses(params: PublicWarehouseListParams = {}) {
        const query = new URLSearchParams();

        // Mặc định chỉ lấy kho active
        query.append('is_active', 'true');

        if (params.keywords) query.append('keywords', params.keywords);
        if (params.province_id) query.append('province_id', params.province_id);
        if (params.rental_status) query.append('rental_status', params.rental_status);

        // Pagination
        const limit = params.limit || 20;
        query.append('limit', String(limit));
        if (params.page && params.page > 0) {
            const offset = (params.page - 1) * limit;
            query.append('offset', String(offset));
        }

        const response = await fetch(`${API}/warehouse-templates?${query.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouses');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Lấy chi tiết kho (Public - không cần auth)
     * @param id ID kho
     * @returns Chi tiết kho
     */
    async getPublicWarehouseById(id: string) {
        const response = await fetch(`${API}/warehouse-templates/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse details');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Lấy danh sách ảnh kho (Public - không cần auth)
     * @param id ID kho
     * @returns Danh sách ảnh kho
     */
    async getWarehouseImages(id: string): Promise<WarehouseImage[]> {
        const response = await fetch(`${API}/warehouse-templates/${id}/images`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse images');
        }

        const data = await response.json();
        return data.data || [];
    }
}

export const publicWarehouseService = new PublicWarehouseService();
