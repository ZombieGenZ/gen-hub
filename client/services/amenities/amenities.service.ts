import { AmenityRequest } from "@/types/amenities/amenities.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class AmenitiesService {

    /**
     * Lấy tất cả tiện nghi
     * @param access_token Token truy cập
     * @param params Tham số truy vấn
     * @returns Danh sách tiện nghi
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
        
        console.log('🌐 API Call:', { url, params });
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store' // Disable browser cache
            });
            if (!response.ok) {
                throw new Error('Failed to fetch amenities');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching amenities:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin một tiện nghi
     * @param access_token Token truy cập
     * @param amenity_id ID của tiện nghi
     * @returns Thông tin tiện nghi
     */
    async getAmenity(access_token: string, amenity_id: string) {
        try {
            const response = await fetch(`${API}/amenities/${amenity_id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch amenity');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching amenity:', error);
            throw error;
        }
    }

    /**
     * Tạo tiện nghi mới
     * @param access_token Token truy cập
     * @param amenityData Dữ liệu tiện nghi cần tạo
     * @returns Thông tin tiện nghi sau khi tạo
     */
    async createAmenity(access_token: string, amenityData: AmenityRequest) {
        try {
            const response = await fetch(`${API}/amenities`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(amenityData)
            });
            if (!response.ok) {
                throw new Error('Failed to create amenity');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating amenity:', error);
            throw error;
        }
    }

    /**
     * Cập nhật tiện nghi
     * @param access_token Token truy cập
     * @param amenity_id ID của tiện nghi
     * @param amenityData Dữ liệu cập nhật tiện nghi
     * @returns Thông tin tiện nghi sau khi cập nhật
     */
    async updateAmenity(access_token: string, amenity_id: string, amenityData: AmenityRequest) {
        try {
            const response = await fetch(`${API}/amenities/${amenity_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(amenityData)
            });
            if (!response.ok) {
                throw new Error('Failed to update amenity');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating amenity:', error);
            throw error;
        }
    }

    /**
     * Xoá tiện nghi
     * @param access_token Token truy cập
     * @param amenity_id ID của tiện nghi
     * @returns Thông tin tiện nghi sau khi xoá
     */
    async deleteAmenity(access_token: string, amenity_id: string) {
        try {
            const response = await fetch(`${API}/amenities/${amenity_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                }
            });
            if (!response.ok) {
                throw new Error('Failed to delete amenity');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting amenity:', error);
            throw error;
        }
    }

    /**
     * Xoá nhiều tiện nghi
     * @param access_token Token truy cập
     * @param amenity_ids Danh sách ID của tiện nghi cần xoá
     * @returns Thông tin tiện nghi sau khi xoá
     */
    async deleteMultipleAmenities(access_token: string, amenity_ids: string[]) {
        try {
            const response = await fetch(`${API}/amenities/delete-multiple`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids:amenity_ids })
            });
            if (!response.ok) {
                throw new Error('Failed to delete multiple amenities');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting multiple amenities:', error);
            throw error;
        }
    }
};