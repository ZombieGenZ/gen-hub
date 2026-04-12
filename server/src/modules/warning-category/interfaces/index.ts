import { WarningCategory } from '@prisma/client';

/**
 * Interface cho danh sách danh mục với phân trang
 */
export interface IWarningCategoryListResult {
  items: WarningCategory[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface cho response danh mục
 */
export interface IWarningCategoryResponse {
  id: string;
  name: string;
  description?: string;
  severity: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
  created_by: string;
}
