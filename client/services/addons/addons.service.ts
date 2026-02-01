import { AddonRequest } from "@/types/addon/addon.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class AddonsService {
    /**
     * Lấy tất cả addons
     * @param access_token Token truy cập
     * @returns Danh sách tất cả addons
     */
    async getAllAddons(access_token: string, params?: {
        limit?: number;
        offset?: number;
        keywords?: string;
        is_active?: boolean;
        addon_type_id?: string;
    }) {
        try {
            const queryParams = new URLSearchParams();
            if (params) {
                if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
                if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
                if (params.keywords) queryParams.append('keywords', params.keywords);
                if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
                if (params.addon_type_id) queryParams.append('addon_type_id', params.addon_type_id);
            }

            const response = await fetch(`${API}/addons?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch addons');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching addons:', error);
            throw error;
        }
    }

    /**
     * Lấy addon theo ID
     * @param access_token Token truy cập
     * @param addon_id ID của addon
     * @returns Thông tin chi tiết của addon
     */
    async getAddonById(access_token: string, addon_id: string) {
        try {
            const response = await fetch(`${API}/addons/${addon_id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch addon by id');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching addon by id:', error);
            throw error;
        }
    }

    /**
     * Lấy tất cả addons đang kích hoạt
     * @param access_token Token truy cập
     * @returns Danh sách các addon đang hoạt động
     */
    async getAllAddonActive(access_token: string) {
        try {
            const response = await fetch(`${API}/addons/active`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch active addons');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching active addons:', error);
            throw error;
        }
    }

    /**
     * Lấy addon công khai cho BookingWidget (Không cần auth)
     * @returns Danh sách addon công khai đang hoạt động
     */
    async getPublicActiveAddons() {
        try {
            const response = await fetch(`${API}/public/addons/active`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch public active addons');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching public active addons:', error);
            throw error;
        }
    }


    /**
     * Tạo addon mới
     * @param access_token Token truy cập
     * @param addonData Dữ liệu addon cần tạo
     * @returns Thông tin addon sau khi tạo
     */
    async createAddon(access_token: string, addonData: AddonRequest) {
        try {
            const response = await fetch(`${API}/addons`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addonData)
            });
            if (!response.ok) {
                throw new Error('Failed to create addon');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating addon:', error);
            throw error;
        }
    }

    /**
     * Cập nhật addon
     * @param access_token Token truy cập
     * @param addon_id ID của addon
     * @param addonData Dữ liệu cập nhật addon
     * @returns Thông tin addon sau khi cập nhật
     */
    async updateAddon(access_token: string, addon_id: string, addonData: AddonRequest) {
        try {
            const response = await fetch(`${API}/addons/${addon_id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addonData)
            });
            if (!response.ok) {
                throw new Error('Failed to update addon');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error updating addon:', error);
            throw error;
        }
    }

    /**
     * Xóa addon
     * @param access_token Token truy cập
     * @param addon_id ID của addon cần xóa
     * @returns Kết quả xóa addon
     */
    async deleteAddon(access_token: string, addon_id: string) {
        try {
            const response = await fetch(`${API}/addons/${addon_id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to delete addon');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting addon:', error);
            throw error;
        }
    }

    /**
     * Xóa nhiều addon
     * @param access_token Token truy cập
     * @param addon_ids Danh sách ID các addon cần xóa
     * @returns Kết quả xóa nhiều addon
     */
    async deleteManyAddons(access_token: string, addon_ids: string[]) {
        try {
            const response = await fetch(`${API}/addons/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids:addon_ids })
            });
            if (!response.ok) {
                throw new Error('Failed to delete addons');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error deleting addons:', error);
            throw error;
        }
    }
}