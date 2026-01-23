import { CreateUpdateCategoryRequest } from "@/types/categories/categories.type";

const API = process.env.NEXT_PUBLIC_API_URL

export class CategoriesService {

    // Lấy tất cả danh mục
    async getAllCategories(access_token: string) {
        try {
            const response = await fetch(`${API}/categories`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch categories');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch categories", err);
        }
    }

    // Lấy danh mục theo ID
    async getCategoryById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/categories/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch category by id');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch category by id", err);
        }
    }

    // Lấy danh mục theo active
    async getActiveCategories(access_token: string) {
        try {
            const response = await fetch(`${API}/categories/active`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch active categories');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to fetch active categories", err);
        }
    }

    // Tạo danh mục
    async createCategory(access_token: string, request: CreateUpdateCategoryRequest) {
        try {
            const response = await fetch(`${API}/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });
            if (!response.ok) {
                throw new Error('Failed to create category');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    // Cập nhật danh mục
    async updateCategory(access_token: string, id: string, request: CreateUpdateCategoryRequest) {
        try {
            const response = await fetch(`${API}/categories/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update category');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to update category", err);
        }
    }

    // Xóa danh mục
    async deleteCategory(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/categories/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
            })
            if(!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete category');
            }
            const data = await response.json();
            return data;
        }
        catch(err) {
            console.error("Failed to delete category", err);
        }
    }
}