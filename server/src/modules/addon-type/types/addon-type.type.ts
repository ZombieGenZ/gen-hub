import { AddonType, AddonTypeOnAddon } from '@prisma/client';

/**
 * Interface cho AddonType với relations
 */
export interface IAddonTypeWithRelations extends AddonType {
  addons?: AddonTypeOnAddon[];
}

/**
 * Response phân trang cho AddonType
 */
export interface IAddonTypePaginatedResponse {
  items: IAddonTypeWithRelations[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
