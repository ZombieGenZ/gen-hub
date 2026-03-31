import { CreateArticleDto, UpdateArticleDto, QueryArticleDto, ArticleResponse } from "@/types/article/article.type";

const API = process.env.NEXT_PUBLIC_API_URL;

export class ArticleService {
    /**
     * Lấy danh sách bài viết (Admin)
     * @param access_token Token truy cập
     * @param params Tham số truy vấn (limit, offset, keywords, type, status, category_id)
     * @returns Danh sách bài viết
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
     * @param params Tham số truy vấn (limit, offset, keywords, type, category_id)
     * @returns Danh sách bài viết công khai
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
     * @param access_token Token truy cập
     * @param id ID bài viết
     * @returns Chi tiết bài viết
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
     * @param access_token Token truy cập
     * @param data Dữ liệu bài viết mới
     * @returns Kết quả tạo bài viết
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
     * @param access_token Token truy cập
     * @param id ID bài viết
     * @param data Dữ liệu bài viết cần cập nhật
     * @returns Kết quả cập nhật bài viết
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
     * @param access_token Token truy cập
     * @param id ID bài viết
     * @returns Kết quả xóa bài viết
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
     * Tăng lượt xem bài viết
     * @param id ID bài viết
     * @returns Kết quả tăng lượt xem
     */
    async incrementView(id: string) {
        try {
            const response = await fetch(`${API}/articles/${id}/view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to increment view');
            }
            return await response.json();
        } catch (error) {
            console.error('Error incrementing view:', error);
            throw error;
        }
    }

    /**
     * Tăng lượt chia sẻ bài viết
     * @param id ID bài viết
     * @returns Kết quả tăng lượt chia sẻ
     */
    async incrementShare(id: string) {
        try {
            const response = await fetch(`${API}/articles/${id}/share`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to increment share');
            }
            return await response.json();
        } catch (error) {
            console.error('Error incrementing share:', error);
            throw error;
        }
    }

    /**
     * Lấy lịch sử chỉnh sửa bài viết
     * @param access_token Token truy cập
     * @param id ID bài viết
     * @returns Lịch sử chỉnh sửa
     */
    async getEditHistory(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/articles/${id}/history`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch edit history');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching edit history:', error);
            throw error;
        }
    }

    /**
     * Tạo SEO tự động bằng AI
     * @param access_token Token truy cập
     * @param id ID bài viết
     * @returns Kết quả tạo SEO
     */
    async generateSeo(access_token: string, id: string) {
        try {
            const response = await fetch(`${API}/articles/${id}/generate-seo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to generate SEO');
            }
            return await response.json();
        } catch (error) {
            console.error('Error generating SEO:', error);
            throw error;
        }
    }
}

export const articleService = new ArticleService();
