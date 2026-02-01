import { Province } from "@/types/location/provinces.type";
import { Ward } from "@/types/location/wards.type";

const API = process.env.NEXT_PUBLIC_API_URL

export class LocationService {

    /**
     * Lấy danh sách tỉnh/thành phố
     * @param params Tham số truy vấn
     * @returns Danh sách tỉnh/thành phố
     */
    async getProvinces(params: {
        keywords?: string;
        is_active?: boolean;
        rental_status?: string;
        province_id?: string;
        page?: number;
        limit?: number;
        type?: string;
    } = {}): Promise<Province[]> {
        
        const query = new URLSearchParams();
        
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.rental_status) query.append('rental_status', params.rental_status);
        if (params.province_id) query.append('province_id', params.province_id);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.type) query.append('type', params.type);
        
        const queryString = query.toString();
        const url = queryString ? `${API}/provinces?${queryString}` : `${API}/provinces`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch provinces');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching provinces:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin tỉnh theo ID
     * @param province_id ID của tỉnh/thành phố
     * @returns Thông tin tỉnh/thành phố
     */
    async getProvincesById(province_id: string): Promise<Province> {
        try {
            const response = await fetch(`${API}/provinces/${province_id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch province by id');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching province by id:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách phường/xã
     * @param params Tham số truy vấn
     * @returns Danh sách phường/xã
     */
    async getWards(params: {
        keywords?: string;
        is_active?: boolean;
        rental_status?: string;
        province_id?: string;
        page?: number;
        limit?: number;
        type?: string;
    } = {}): Promise<Ward[]> {
        const query = new URLSearchParams();
        
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
        if (params.rental_status) query.append('rental_status', params.rental_status);
        if (params.province_id) query.append('province_id', params.province_id);
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.type) query.append('type', params.type);
        
        const queryString = query.toString();
        const url = queryString ? `${API}/wards?${queryString}` : `${API}/wards`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch wards');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching wards:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin phường/xã theo ID
     * @param ward_id ID của phường/xã
     * @returns Thông tin phường/xã
     */
    async getWardById(ward_id: string): Promise<Ward> {
        try {
            const response = await fetch(`${API}/wards/${ward_id}`);
            if (!response.ok) {
                throw new Error('Failed to fetch ward by id');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching ward by id:', error);
            throw error;
        }
    }
}