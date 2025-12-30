import { AddonRequest } from "@/types/addon/addon.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class AddonsService {
    // Lấy tất cả addons
    async getAllAddons(access_token: string) {
        try {
            const response = await fetch(`${API}/addons`, {
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

    // Lấy addon theo ID
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

    // addon kích hoạt
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

    //Tạo addon mới (Để kiểu any để tạm thời đến khi có kiểu dữ liệu chính xác)
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

    //Cập nhật addon
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

    //Xóa addon
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

    //xoá many addon
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