const API = process.env.NEXT_PUBLIC_API_URL

export class WarehouseTemplateService {

    // Lấy danh sách kho
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
        console.log(data)
        return data.data;
    }

    // Lấy kho bằng ID
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

    // Lấy ảnh từng kho
    async getWarehouseImage(access_token: string, warehouse_id: string) {
        const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/images`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
        })  

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch warehouse template details');
        }

        const data = await response.json();
        return data;
    }

    // API Row warehouse
    /**
     * Lấy danh sách hàng trong kho
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách hàng trong kho
     */
    async getWarehouseRow(warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }
            const data = await response.json();
            return data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse row", err);
        }
    }

    // API Rack warehouse
    /**
     * Lấy danh sách cột trong hàng
     * @param row_id ID của hàng
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách cột trong hàng
     */
    async getWarehouseRack(row_id: string, warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/rack`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }
            const data = await response.json();
            return data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse rack", err);
        }
    }

    /**
     * Lấy danh sách hàng trong kho
     * @param rack_id ID của rack
     * @param row_id ID của hàng
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách hàng trong kho
     */
    // API Shelf warehouse

    async getWarehouseShelf(rack_id: string, row_id: string, warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/rack/${rack_id}/shelves`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }
            const data = await response.json();
            return data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse shelf", err);
        }
    }

    // API Block warehouse
    /**
     * Lấy danh sách khối trong hàng
     * @param shelves_id ID của hàng
     * @param rack_id ID của rack
     * @param row_id ID của hàng
     * @param warehouse_id ID của kho
     * @param access_token Token truy cập
     * @returns Danh sách khối trong hàng
     */
    async getWarehouseBlock(shelves_id: string, rack_id: string, row_id: string, warehouse_id: string, access_token: string) {
        try {
            const response = await fetch(`${API}/warehouse-templates/${warehouse_id}/rows/${row_id}/rack/${rack_id}/shelves/${shelves_id}/blocks`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })

            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch warehouse template details');
            }

            const data = await response.json();
            return data;
        }
        catch (err) {
            console.error("Failed to fetch warehouse block", err);
        }
    }
}

export const warehouseTemplateService = new WarehouseTemplateService();