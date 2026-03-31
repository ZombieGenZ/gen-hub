import { Permission as PermissionType } from "@/types/user/user.type";

const API = process.env.NEXT_PUBLIC_API_URL;

/**
 * Service quản lý quyền hạn (Permissions) trong hệ thống.
 * Cung cấp các phương thức để tương tác với API backend liên quan đến phân quyền.
 */
export class PermissionService {
    /**
     * Lấy toàn bộ danh sách quyền hạn có trong hệ thống.
     * 
     * @param accessToken - Token xác thực của người dùng (JWT).
     * @returns Promise chứa danh sách Permission hoặc lỗi nếu fetch thất bại.
     */
    async getAllPermissions(accessToken: string): Promise<PermissionType[]> {
        try {
            const response = await fetch(`${API}/permissions`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách quyền hạn');
            }

            const data = await response.json();
            // Thường API trả về dạng { success: true, data: [...] } hoặc trực tiếp mảng
            return data.data || data;
        } catch (error) {
            console.error('Lỗi khi lấy toàn bộ danh sách permission:', error);
            throw error;
        }
    }

/**
     * Lấy danh sách modules (prefix) duy nhất từ permission keys
     */
    async getModules(accessToken: string): Promise<string[]> {
        try {
            const response = await fetch(`${API}/permissions/modules`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách modules');
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách modules:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách permission IDs theo role IDs (POST /permissions/by-roles)
     */
    async getPermissionIdsByRoleIds(accessToken: string, roleIds: string[]): Promise<string[]> {
        if (!roleIds || roleIds.length === 0) return [];
        
        try {
            const response = await fetch(`${API}/permissions/by-roles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role_ids: roleIds }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy permission IDs theo roles');
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Lỗi khi lấy permission IDs theo role IDs:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin chi tiết của một danh sách các quyền hạn dựa trên mảng IDs.
     * 
     * @param accessToken - Token xác thực.
     * @param ids - Mảng chứa các UUID của permission cần lấy.
     * @returns Promise chứa mảng các Permission tương ứng.
     */
    async getPermissionsByIds(accessToken: string, ids: string[]): Promise<PermissionType[]> {
        if (!ids || ids.length === 0) return [];
        
        try {
            // Tùy vào backend hỗ trợ query params như thế nào, 
            // thông thường là ?ids=id1,id2 hoặc gửi nhiều param ids=id1&ids=id2
            const queryParams = new URLSearchParams();
            ids.forEach(id => queryParams.append('ids', id));

            const response = await fetch(`${API}/permissions/by-ids?${queryParams.toString()}`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin chi tiết các quyền hạn');
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách permission theo IDs:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin chi tiết một quyền hạn theo ID.
     * 
     * @param accessToken - Token xác thực.
     * @param id - ID của permission.
     */
    async getPermissionById(accessToken: string, id: string): Promise<PermissionType> {
        try {
            const response = await fetch(`${API}/permissions/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không tìm thấy quyền hạn này');
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error(`Lỗi khi lấy permission ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * Tạo một quyền hạn mới (Dành cho Admin hệ thống).
     * 
     * @param accessToken - Token xác thực.
     * @param permissionData - Dữ liệu permission mới (name, key, description).
     */
    async createPermission(accessToken: string, permissionData: Partial<PermissionType>): Promise<PermissionType> {
        try {
            const response = await fetch(`${API}/permissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(permissionData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Tạo quyền hạn thất bại');
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error('Lỗi khi tạo permission mới:', error);
            throw error;
        }
    }
}

// Export một instance duy nhất để sử dụng trong toàn bộ ứng dụng (Singleton pattern)
export const permissionService = new PermissionService();
