import { CreateArticleDto, UpdateArticleDto, QueryArticleDto, ArticleResponse } from "@/types/article/article.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class ArticleService {
    /**
     * Lấy danh sách bài viết (Admin)
     */
    async getAllArticles(access_token: string, params?: QueryArticleDto) {
        try {
            const queryParams = new URLSearchParams();
            if (params) {
                if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
                if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
                if (params.keywords) queryParams.append('keywords', params.keywords);
                if (params.type) queryParams.append('type', params.type);
                if (params.status) queryParams.append('status', params.status);
                if (params.category_id) queryParams.append('category_id', params.category_id);
            }

            const response = await fetch(`${API}/articles?${queryParams.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch articles');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching articles:', error);
            throw error;
        }
    }

    /**
     * Lấy bài viết public
     */
    async getPublicArticles(params?: QueryArticleDto) {
        try {
             const queryParams = new URLSearchParams();
            if (params) {
                if (params.limit !== undefined) queryParams.append('limit', params.limit.toString());
                if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
                if (params.keywords) queryParams.append('keywords', params.keywords);
                if (params.type) queryParams.append('type', params.type);
                if (params.category_id) queryParams.append('category_id', params.category_id);
            }

            const response = await fetch(`${API}/articles/public?${queryParams.toString()}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch public articles');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching public articles:', error);
            throw error;
        }
    }

    /**
     * Lấy chi tiết bài viết (Admin)
     */
    async getArticleById(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/articles/${id}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch article by id');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching article by id:', error);
            throw error;
        }
    }

    /**
     * Tạo bài viết mới
     */
    async createArticle(access_token: string, data: CreateArticleDto) {
        try {
            const response = await fetch(`${API}/articles`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to create article');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error creating article:', error);
            throw error;
        }
    }

    /**
     * Cập nhật bài viết
     */
    async updateArticle(access_token: string, id: string, data: UpdateArticleDto) {
        try {
            const response = await fetch(`${API}/articles/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                throw new Error('Failed to update article');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error updating article:', error);
            throw error;
        }
    }

    /**
     * Xóa bài viết
     */
    async deleteArticle(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/articles/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to delete article');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting article:', error);
            throw error;
        }
    }

    /**
     * Xóa nhiều bài viết
     */
    async deleteManyArticles(access_token: string, ids: string[]) {
        try {
            const response = await fetch(`${API}/articles/delete/many`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids })
            });
            if (!response.ok) {
                throw new Error('Failed to delete many articles');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error deleting many articles:', error);
            throw error;
        }
    }
}
