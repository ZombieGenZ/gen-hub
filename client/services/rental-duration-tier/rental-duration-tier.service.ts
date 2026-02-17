import { RentalDurationTierRequest } from "@/types/rental-duration-tier/rental-duration-tier.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class RentalDurationTierService {

    /**
     * Lấy danh sách các gói thời gian thuê
     * @param access_token Token truy cập
     * @param params Các tham số lọc
     * @returns Danh sách gói thời gian thuê
     */
    async getAllRentalDuratuion(access_token: string, params: {
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
        try {
            const response = await fetch(`${API}/rental-duration-tiers?${query.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                }
            })
            if (!response.ok) {
                throw new Error('Failed to fetch rental duration tier');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching rental duration tier:', error);
            throw error;   
        }
    }

    /**
     * Lấy 1 gói thời gian thuê cụ thể
     * @param access_token Token truy cập
     * @param id ID của gói thời gian thuê
     * @returns Thông tin gói thời gian thuê
     */
    async getRentalDurationTier(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/rental-duration-tiers/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                }
            })
            if (!response.ok) {
                throw new Error('Failed to fetch rental duration tier');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching rental duration tier:', error);
            throw error;
        }
    }

    // Lấy danh sách gói thời gian thuê công khai cho BookingWidget (Không cần auth)
    async getPublicActiveTiers() {
        try {
            const response = await fetch(`${API}/public/rental-duration-tiers/active`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            if (!response.ok) {
                throw new Error('Failed to fetch public active rental duration tiers');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching public active rental duration tiers:', error);
            throw error;
        }
    }

    /**
     * Tạo gói thời gian thuê
     * @param access_token Token truy cập
     * @param data Dữ liệu tạo mới
     * @returns Gói thời gian thuê vừa tạo
     */
    async createRentalDurationTier(access_token: string, data: RentalDurationTierRequest) {
        try {
            const response = await fetch(`${API}/rental-duration-tiers`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create rental duration tier');
            }
            return await response.json();
        } catch (error) {
            console.error('Error creating rental duration tier:', error);
            throw error;
        }
    }

    /**
     * Cập nhật gói thời gian thuê
     * @param access_token Token truy cập
     * @param id ID của gói thời gian thuê
     * @param data Dữ liệu cập nhật
     * @returns Gói thời gian thuê đã cập nhật
     */
    async updateRentalDurationTier(access_token: string, id: string, data: Partial<RentalDurationTierRequest>) {
        try {
            const response = await fetch(`${API}/rental-duration-tiers/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update rental duration tier');
            }
            return await response.json();
        } catch (error) {
            console.error('Error updating rental duration tier:', error);
            throw error;
        }
    }

    /**
     * Xoá gói thời gian thuê
     * @param access_token Token truy cập
     * @param id ID của gói thời gian thuê
     * @returns Kết quả xoá
     */
    async deleteRentalDurationTier(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/rental-duration-tiers/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete rental duration tier');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting rental duration tier:', error);
            throw error;
        }
    }

    /**
     * Xoá nhiều gói thời gian thuê
     * @param access_token Token truy cập
     * @param ids Danh sách ID gói thời gian thuê
     * @returns Kết quả xoá nhiều
     */
    async deleteMultipleRentalDurationTier(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/rental-duration-tiers/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete multiple rental duration tiers');
            }
            return await response.json();
        } catch (error) {
            console.error('Error deleting multiple rental duration tiers:', error);
            throw error;
        }
    }
}