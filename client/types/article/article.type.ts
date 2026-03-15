import { CategoryResponse } from "./category.type";

export type ArticleType = 'BLOG' | 'GUIDE' | 'NEWS' | 'ANNOUNCEMENT';
export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'HIDDEN';

export interface ArticleResponse {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    thumbnail?: string;
    type: ArticleType;
    status: ArticleStatus;
    categories?: CategoryResponse[];
    tags?: string[];
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    allow_comments: boolean;
    is_featured: boolean;
    view_count: number;
    share_count: number;
    created_at: string;
    updated_at: string;
}

export interface CreateArticleDto {
    title: string;
    slug: string;
    excerpt?: string;
    content: string;
    thumbnail?: string;
    type: ArticleType;
    status?: ArticleStatus;
    category_ids?: string[];
    tags?: string[];
    seo_title?: string;
    seo_description?: string;
    seo_keywords?: string[];
    allow_comments?: boolean;
    is_featured?: boolean;
}

export interface UpdateArticleDto extends Partial<CreateArticleDto> {}

export interface QueryArticleDto {
    limit?: number;
    offset?: number;
    keywords?: string;
    type?: ArticleType;
    status?: ArticleStatus;
    category_id?: string;
}
