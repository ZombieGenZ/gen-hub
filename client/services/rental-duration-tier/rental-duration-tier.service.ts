import { RentalDurationTier } from "@/types/rental-duration-tier/rental-duration-tier.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class RentalDurationTierService {

    // Lấy danh sách các gói thời gian thuê
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

    // Lấy 1 gói thời gian thuê cụ thể
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


    // Tạo gói thời gian thuê
    async createRentalDurationTier(access_token: string, data: RentalDurationTier) {
        
    }

    // Cập nhật gói thời gian thuê
    async updateRentalDurationTier(access_token: string, id: string, data: RentalDurationTier) {
        
    }

    // Xoá gói thời gian thuê
    async deleteRentalDurationTier(access_token: string, id: string) {
        
    }

    // Xoá nhiều gói thời gian thuê
    async deleteMultipleRentalDurationTier(access_token: string, ids: string[]) {
        
    }
}