import { Category, CategoryStatus } from '@prisma/client';

/**
 * Interface cho Category với quan hệ
 */
export interface ICategoryWithRelations extends Category {
  parent?: Category | null;
  children?: Category[];
  _count?: {
    articles: number;
    children: number;
  };
}

/**
 * Interface cho response phân trang
 */
export interface ICategoryPaginatedResponse {
  items: ICategoryWithRelations[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Interface cho tạo category
 */
export interface ICreateCategory {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  color?: string;
  parent_id?: string;
  order?: number;
  status?: CategoryStatus;
  is_featured?: boolean;
  is_active?: boolean;
  created_by: string;
}

/**
 * Interface cho cập nhật category
 */
export interface IUpdateCategory {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  image_url?: string;
  color?: string;
  parent_id?: string;
  order?: number;
  status?: CategoryStatus;
  is_featured?: boolean;
  is_active?: boolean;
  updated_by: string;
}
