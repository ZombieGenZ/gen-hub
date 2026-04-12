export interface IUnit {
  id: string;
  organization_id: string;
  name: string | null;
  description: string | null;
  is_used_multiple_languages: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean | null;
}

// Re-export IPaginatedResponse từ common
export type { IPaginatedResponse } from '../../../common/interfaces/index.js';
