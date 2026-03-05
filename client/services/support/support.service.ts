import type { ApiResponse, PaginatedResponse } from '@/services/common.types';
import type { FAQ, Article } from '../../types/support/support.type';

const API = process.env.NEXT_PUBLIC_API_URL;

export class SupportService {

    // ==================== FAQ ====================

    /**
     * Lấy danh sách FAQ công khai
     */
    async listPublicFAQs(category?: string): Promise<ApiResponse<FAQ[]>> {
        const query = category ? `?category=${category}` : '';
        const response = await fetch(`${API}/public/faqs${query}`);
        if (!response.ok) throw new Error('Không thể tải danh sách câu hỏi thường gặp');
        return await response.json();
    }

    /**
     * Admin: Quản lý FAQ
     */
    async adminListFAQs(token: string): Promise<PaginatedResponse<FAQ>> {
        const response = await fetch(`${API}/admin/faqs`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Không thể tải danh sách FAQ quản trị');
        return await response.json();
    }

    // ==================== ARTICLES (TIN TỨC) ====================

    /**
     * Lấy danh sách bài viết công khai
     */
    async listPublicArticles(params: { category?: string; keywords?: string; limit?: number; offset?: number } = {}): Promise<PaginatedResponse<Article>> {
        const query = new URLSearchParams();
        if (params.category) query.append('category', params.category);
        if (params.keywords) query.append('keywords', params.keywords);
        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset) query.append('offset', String(params.offset));

        const response = await fetch(`${API}/public/articles?${query.toString()}`);
        if (!response.ok) throw new Error('Không thể tải danh sách bài viết');
        return await response.json();
    }

    /**
     * Lấy chi tiết bài viết qua slug
     */
    async getArticleBySlug(slug: string): Promise<ApiResponse<Article>> {
        const response = await fetch(`${API}/public/articles/${slug}`);
        if (!response.ok) throw new Error('Không thể tìm thấy bài viết');
        return await response.json();
    }
}

export const supportService = new SupportService();
