import {
  Article,
  ArticleStatus,
  ArticleType,
  ArticleCategory,
  ArticleEmoji,
  ArticleReaction,
  ArticleComment,
  ArticleEditHistory,
} from '@prisma/client';

/**
 * Interface cho Article với quan hệ
 */
export interface IArticleWithRelations extends Article {
  categories?: (ArticleCategory & {
    category?: {
      id: string;
      name: string;
      slug: string;
    };
  })[];
  reactions?: ArticleReaction[];
  comments?: ArticleComment[];
  edit_history?: ArticleEditHistory[];
  _count?: {
    reactions: number;
    comments: number;
  };
}

/**
 * Interface cho response phân trang
 */
export interface IArticlePaginatedResponse {
  items: IArticleWithRelations[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Interface cho tạo article
 */
export interface ICreateArticle {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  thumbnail_url?: string;
  cover_image_url?: string;
  type?: ArticleType;
  status?: ArticleStatus;
  author_id?: string;
  author_name?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  allow_comments?: boolean;
  published_at?: Date;
  scheduled_at?: Date;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  category_ids?: string[];
  created_by: string;
}

/**
 * Interface cho cập nhật article
 */
export interface IUpdateArticle {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  thumbnail_url?: string;
  cover_image_url?: string;
  type?: ArticleType;
  status?: ArticleStatus;
  author_name?: string;
  is_featured?: boolean;
  is_pinned?: boolean;
  allow_comments?: boolean;
  published_at?: Date;
  scheduled_at?: Date;
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string[];
  category_ids?: string[];
  updated_by: string;
}

/**
 * Interface cho ArticleEmoji
 */
export interface IArticleEmoji extends ArticleEmoji {
  _count?: {
    reactions: number;
  };
}

/**
 * Interface cho ArticleComment với quan hệ
 */
export interface IArticleCommentWithRelations extends ArticleComment {
  replies?: ArticleComment[];
  edit_history?: {
    id: string;
    old_content: string;
    new_content: string;
    edited_by: string;
    edit_reason?: string | null;
    created_at: Date;
  }[];
}

/**
 * Interface cho response phân trang comments
 */
export interface IArticleCommentPaginatedResponse {
  items: IArticleCommentWithRelations[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Interface cho reaction summary
 */
export interface IReactionSummary {
  emoji_id: string;
  emoji: string;
  name: string;
  count: number;
}

/**
 * Interface cho AI SEO generation
 */
export interface ISeoGenerationResult {
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
}
