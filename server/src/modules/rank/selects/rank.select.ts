import { Prisma } from '@prisma/client';

export const rankListSelect = {
  id: true,
  name: true,
  description: true,
  is_default: true,
  min_loyalty_points: true,
  is_active: true,
  is_deleted: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  deleted_at: true,
  deleted_by: true,
} satisfies Prisma.RankSelect;

export const rankDetailSelect = {
  ...rankListSelect,
} satisfies Prisma.RankSelect;
