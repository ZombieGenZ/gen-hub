import { orgHelper } from '@/lib/organization.utils';
import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type {
    Product,
    CreateProductPayload,
    UpdateProductPayload,
    QueryProductParams,
} from './product.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class ProductService {
    /**
     * Tạo sản phẩm mới
     * @param token Access token
     * @param data Dữ liệu sản phẩm (bao gồm đơn vị tính quy đổi nếu có)
     * @returns Response chứa sản phẩm vừa tạo
     */
    async create(token: string, data: CreateProductPayload): Promise<ApiResponse<Product>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể tạo sản phẩm');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi tạo sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Lấy danh sách sản phẩm (có phân trang)
     * @param token Access token
     * @param query Tham số lọc & phân trang
     * @returns Response phân trang chứa danh sách sản phẩm
     */
    async list(token: string, query?: QueryProductParams): Promise<PaginatedResponse<Product>> {
        try {
            const orgId = await orgHelper.getOrgId(token);

            const params = new URLSearchParams();
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.is_active != null) params.append('is_active', String(query.is_active));

            const qs = params.toString();
            const url = `${API}/organizations/${orgId}/products${qs ? `?${qs}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy danh sách sản phẩm');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết sản phẩm theo ID (bao gồm đơn vị tính cơ bản và quy đổi)
     * @param token Access token
     * @param id ID sản phẩm
     * @returns Response chứa thông tin sản phẩm
     */
    async getById(token: string, id: string): Promise<ApiResponse<Product>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể lấy thông tin sản phẩm');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi lấy thông tin sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Cập nhật sản phẩm
     * @param token Access token
     * @param id ID sản phẩm
     * @param data Dữ liệu cần cập nhật
     * @returns Response chứa sản phẩm sau khi cập nhật
     */
    async update(token: string, id: string, data: UpdateProductPayload): Promise<ApiResponse<Product>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể cập nhật sản phẩm');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi cập nhật sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Xóa một sản phẩm (soft delete)
     * @param token Access token
     * @param id ID sản phẩm
     * @returns Response xác nhận xóa
     */
    async delete(token: string, id: string): Promise<ApiResponse<null>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xóa sản phẩm');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi xóa sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Xóa nhiều sản phẩm cùng lúc (soft delete)
     * @param token Access token
     * @param ids Danh sách ID sản phẩm cần xóa
     * @returns Response xác nhận xóa
     */
    async deleteMany(token: string, ids: string[]): Promise<ApiResponse<null>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ids }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể xóa nhiều sản phẩm');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Lỗi khi xóa nhiều sản phẩm:', error);
            throw error;
        }
    }

    /**
     * Xuất danh sách sản phẩm ra file Excel
     * @param token Access token
     * @returns Blob chứa dữ liệu file Excel
     */
    async exportExcel(token: string): Promise<Blob> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products/export`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Không thể xuất file Excel');
            }

            return await response.blob();
        } catch (error) {
            console.error('Lỗi khi xuất file Excel:', error);
            throw error;
        }
    }

    /**
     * Nhập sản phẩm từ file Excel
     * @param token Access token
     * @param file File Excel được chọn
     * @returns Kết quả nhập (số dòng thành công/lỗi)
     */
    async importExcel(token: string, file: File): Promise<ApiResponse<{ success: number; errors: string[] }>> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API}/organizations/${orgId}/products/import`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Không thể nhập file Excel');
            }

            return await response.json();
        } catch (error) {
            console.error('Lỗi khi nhập file Excel:', error);
            throw error;
        }
    }

    /**
     * Tải file mẫu nhập sản phẩm
     * @param token Access token
     * @returns Blob chứa dữ liệu file Excel mẫu
     */
    async getImportTemplate(token: string): Promise<Blob> {
        try {
            const orgId = await orgHelper.getOrgId(token);
            const response = await fetch(`${API}/organizations/${orgId}/products/template`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Không thể tải file mẫu Excel');
            }

            return await response.blob();
        } catch (error) {
            console.error('Lỗi khi tải file mẫu Excel:', error);
            throw error;
        }
    }
}
