const API = process.env.NEXT_PUBLIC_API_URL;

export class AddonsTypeService {

    /**
     * Lấy tất cả addons type
     * @param access_token Token truy cập
     * @returns Danh sách addons type
     */
    async getAllAddonsType(access_token: string) {
        try {
            const response = await fetch(`${API}/addon-types`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to fetch addons type');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch addons type", err);
        }
    }

    /**
     * Lấy addons type theo ID
     * @param access_token Token truy cập
     * @param id ID của addon type
     * @returns Thông tin addon type
     */
    async getAddonsTypeById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/addon-types/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to fetch addons type by id');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch addons type by id", err);
        }
    }

    /**
     * Lấy addons type theo active
     * @param access_token Token truy cập
     * @returns Danh sách addons type active
     */
    async getAddonsTypeActive(access_token: string) {
        try {
            const response = await fetch(`${API}/addon-types/active`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to fetch addons type active');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch addons type active", err);
        }
    }

    /**
     * Tạo addon type mới
     * @param access_token Token truy cập
     * @param addonTypeData Dữ liệu addon type cần tạo
     * @returns Thông tin addon type sau khi tạo
     */
    async createAddonType(access_token: string, addonTypeData: { name: string, description: string, is_active: boolean }) {
        try {
            const response = await fetch(`${API}/addon-types`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addonTypeData)
            });
            if(!response.ok) {
                throw new Error('Failed to create addon type');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to create addon type", err);
            throw err;
        }
    }

    /**
     * Cập nhật addon type
     * @param access_token Token truy cập
     * @param id ID của addon type
     * @param addonTypeData Dữ liệu cập nhật addon type
     * @returns Thông tin addon type sau khi cập nhật
     */
    async updateAddonType(access_token: string, id: string, addonTypeData: { name: string, description: string, is_active: boolean }) {
        try {
            const response = await fetch(`${API}/addon-types/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(addonTypeData)
            });
            if(!response.ok) {
                throw new Error('Failed to update addon type');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to update addon type", err);
            throw err;
        }
    }

    /**
     * Xóa addon type
     * @param access_token Token truy cập
     * @param id ID của addon type
     * @returns Kết quả xóa
     */
    async deleteAddonType(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/addon-types/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if(!response.ok) {
                throw new Error('Failed to delete addon type');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to delete addon type", err);
            throw err;
        }
    }

    /**
     * Xóa nhiều addon types
     * @param access_token Token truy cập
     * @param ids Danh sách ID addon type
     * @returns Kết quả xóa nhiều
     */
    async deleteManyAddonTypes(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/addon-types/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids: ids })
            });
            if(!response.ok) {
                throw new Error('Failed to delete many addon types');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to delete many addon types", err);
            throw err;
        }
    }
}