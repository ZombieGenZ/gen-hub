// import { PaginatedResponse, ApiResponse } from "../common.types";
import { BatchItem, BatchItemDetail, CreateBatchDto, UpdateBatchDto, BatchQuery } from "../../types/Batches/batches.type";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export class BatchesService {
    /**
     * Lấy danh sách lô hàng theo sản phẩm (có phân trang và tìm kiếm)
     */
    async getAll(accessToken: string, organizationId: string, productId: string, query?: BatchQuery) {
        try {
            const params = new URLSearchParams();
            if (query?.keywords) params.append('keywords', query.keywords);
            if (query?.limit != null) params.append('limit', String(query.limit));
            if (query?.offset != null) params.append('offset', String(query.offset));
            // if (query?.status) params.append('status', query.status);

            const response = await fetch(`${API_URL}/organizations/${organizationId}/products/${productId}/batches?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch batches');
            }
            const data = await response.json();
            return data.data.items; // Giả sử API trả về { data: { items: BatchItem[] } }
        } catch (error) {
            console.error('Error fetching batches:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết một lô hàng
     */
    async getById(id: string, accessToken: string, organizationId: string): Promise<BatchItemDetail> {
        try {
            const response = await fetch(`${API_URL}/organizations/${organizationId}/batches/${id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch batch detail');
            }

            const data = await response.json();
            return data.data; // Giả sử API trả về { data: BatchItemDetail }
        } catch (error) {
            console.error('Error fetching batch detail:', error);
            throw error;
        }
    }

    /**
     * Tạo mới lô hàng
     */
    async create(accessToken: string, organizationId: string, data: CreateBatchDto) {
        // TODO: Implement create logic
        try {
            const response = await fetch(`${API_URL}/organizations/${organizationId}/batches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to create batch');
            }
            const result = await response.json();
            return result; // Giả sử API trả về { data: BatchItem }
        } catch (error) {
            console.error('Error creating batch:', error);
            throw error;
        }
    }

    /**
     * Cập nhật thông tin lô hàng
     */
    async update(accessToken: string, organizationId: string, id: string, data: UpdateBatchDto) {
        // TODO: Implement update logic
        try {            
            const response = await fetch(`${API_URL}/organizations/${organizationId}/batches/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update batch');
            }
            const result = await response.json();
            return result; // Giả sử API trả về { data: BatchItem }
        } catch (error) {
            console.error('Error updating batch:', error);
            throw error;
        }
    }

    /**
     * Xóa lô hàng
     */
    async delete(accessToken: string, organizationId: string, id: string) {
        // TODO: Implement delete logic
        try {
            const response = await fetch(`${API_URL}/organizations/${organizationId}/batches/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete batch');
            }
            return { success: true };
        } catch (error) {
            console.error('Error deleting batch:', error);
            throw error;
        }
    }
}

export const batchesService = new BatchesService();
