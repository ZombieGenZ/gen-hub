import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto, CategoryResponse } from "@/types/article/category.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class CategoryService {
    /**
     * Lấy tất cả danh mục
     */
    async getAllCategories(access_token: string, params?: QueryCategoryDto) {
        try {
            const queryParams = new URLSearchParams();
            if (params) {
                if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
                if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
                if (params.keywords) queryParams.append('keywords', params.keywords);
                if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());
            }

            const response = await fetch(`${API}/categories?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Lấy danh mục hoạt động (Dạng cây public)
     */
    async getActiveCategories() {
        try {
            const response = await fetch(`${API}/categories/active`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch active categories');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching active categories:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết một danh mục
     */
    async getCategoryById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/categories/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch category by id');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching category by id:', error);
            throw error;
        }
    }

    /**
     * Tạo danh mục mới
     */
    async createCategory(access_token: string, data: CreateCategoryDto) {
        try {
            const response = await fetch(`${API}/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to create category');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Cập nhật danh mục
     */
    async updateCategory(access_token: string, id: string, data: UpdateCategoryDto) {
        try {
            const response = await fetch(`${API}/categories/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to update category');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }

    /**
     * Xóa một danh mục
     */
    async deleteCategory(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to delete category');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Xóa nhiều danh mục
     */
    async deleteManyCategories(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/categories/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids })
            });
            if (!response.ok) {
                throw new Error('Failed to delete many categories');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting many categories:', error);
            throw error;
        }
    }
}
