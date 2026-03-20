import { AmenityRequest } from "@/types/amenities/amenities.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class AmenitiesService {

    /**
     * Lấy tất cả tiện nghi
     */
    async getAllAmenities(access_token: string, params: {
        keywords?: string;
        is_active?: boolean;
        rental_status?: string;
        province_id?: string;
        offset?: number;
        limit?: number;
        type?: string;
    } = {}) {
        const query = new URLSearchParams();
        
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.rental_status) query.append('rental_status', params.rental_status);
        if (params.province_id) query.append('province_id', params.province_id);
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.type) query.append('type', params.type);
        
        const url = `${API}/amenities?${query.toString()}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách tiện ích');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy thông tin một tiện nghi
     */
    async getAmenity(access_token: string, amenity_id: string) {
        const response = await fetch(`${API}/amenities/${amenity_id}`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy thông tin tiện ích');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Tạo tiện nghi mới
     */
    async createAmenity(access_token: string, amenityData: AmenityRequest) {
        const response = await fetch(`${API}/amenities`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(amenityData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tạo tiện ích mới');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Cập nhật tiện nghi
     */
    async updateAmenity(access_token: string, amenity_id: string, amenityData: AmenityRequest) {
        const response = await fetch(`${API}/amenities/${amenity_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(amenityData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể cập nhật tiện ích');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xoá tiện nghi
     */
    async deleteAmenity(access_token: string, amenity_id: string) {
        const response = await fetch(`${API}/amenities/${amenity_id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa tiện ích');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xoá nhiều tiện nghi
     */
    async deleteMultipleAmenities(access_token: string, amenity_ids: string[]) {
        const response = await fetch(`${API}/amenities/delete-multiple`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: amenity_ids })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa các tiện ích đã chọn');
        }

        const res = await response.json();
        return res.data;
    }
}

export const amenitiesService = new AmenitiesService();
